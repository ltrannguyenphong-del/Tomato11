from datetime import datetime, time as dt_time
from typing import Any, Dict, List, Optional, Tuple


# ==========================================
# 1. CẤU HÌNH HIỆU CHUẨN & THAM SỐ VẬN HÀNH
# ==========================================
# Thay ADC_DRY và ADC_WET bằng số đo thực tế từ cảm biến SMS-V1.2 trên ESP32
SOIL_ADC_DRY = 3000
SOIL_ADC_WET = 1200

# Ngưỡng cảnh báo bệnh do ẩm cao kéo dài (mặc định 30 phút = 1800 giây)
HIGH_HUMIDITY_THRESHOLD = 80.0
HIGH_HUMIDITY_DURATION_SEC = 30 * 60

# Khung giờ tham chiếu ban ngày (có thể tùy chỉnh theo thực tế)
DAYTIME_START = dt_time(6, 0)
DAYTIME_END = dt_time(18, 0)


# ==========================================
# 2. QUY ĐỔI ĐỘ ẨM ĐẤT (ADC -> 0..100%)
# ==========================================
def convert_soil_adc_to_percent(
    soil_adc: int | float,
    adc_dry: int | float = SOIL_ADC_DRY,
    adc_wet: int | float = SOIL_ADC_WET,
) -> float:
    """
    M = ((ADC_dry - ADC_measured) / (ADC_dry - ADC_wet)) * 100
    Áp dụng khi giá trị ADC giảm khi đất ướt. Kết quả được kẹp trong [0, 100].
    """
    denom = float(adc_dry) - float(adc_wet)
    if denom <= 0:
        raise ValueError("ADC_dry phải lớn hơn ADC_wet khi ADC giảm theo độ ẩm đất.")

    moisture = ((float(adc_dry) - float(soil_adc)) / denom) * 100.0
    return round(max(0.0, min(100.0, moisture)), 2)


def is_daytime(timestamp_iso: Optional[str] = None) -> bool:
    """Xác định thời điểm ban ngày/ban đêm từ timestamp ISO (nếu có), mặc định theo giờ hiện tại."""
    current_dt = datetime.now()
    if timestamp_iso:
        try:
            current_dt = datetime.fromisoformat(timestamp_iso)
        except ValueError:
            pass
    t = current_dt.time()
    if DAYTIME_START <= DAYTIME_END:
        return DAYTIME_START <= t <= DAYTIME_END
    return t >= DAYTIME_START or t <= DAYTIME_END


# ==========================================
# 3. ĐÁNH GIÁ TỪNG CẢM BIẾN
# ==========================================
def evaluate_temperature(temp_c: float) -> Tuple[str, str, str]:
    """Trả về (level, status, recommendation) cho DHT22 nhiệt độ (°C)."""
    if temp_c < 10.0:
        return (
            "danger",
            "Nguy hiểm",
            "Cây có nguy cơ bị tổn thương do lạnh. Che chắn, chuyển cây trồng chậu vào nơi ấm hơn nếu phù hợp; tránh tưới nước lạnh.",
        )
    if temp_c <= 14.0:
        return (
            "warning",
            "Lạnh",
            "Sinh trưởng chậm. Bảo vệ cây khỏi gió lạnh, theo dõi lá và sự phát triển của cây.",
        )
    if temp_c < 18.0:
        return (
            "watch",
            "Cần theo dõi",
            "Nhiệt độ thấp hơn vùng sinh trưởng thuận lợi. Theo dõi vào ban đêm và hạn chế để cây bị lạnh kéo dài.",
        )
    if temp_c <= 27.0:
        return (
            "normal",
            "Thuận lợi",
            "Duy trì thông thoáng, tiếp tục theo dõi độ ẩm đất và ánh sáng.",
        )
    if temp_c <= 32.0:
        return (
            "warning",
            "Cảnh báo nóng",
            "Tăng thông gió, kiểm tra cây có héo không; dùng lưới che nắng nếu ánh sáng và nhiệt độ quá cao.",
        )
    if temp_c <= 35.0:
        return (
            "high",
            "Nóng cao",
            "Tăng che nắng và thông gió, kiểm tra độ ẩm đất. Đặc biệt chú ý rụng hoa và giảm đậu quả.",
        )
    return (
        "danger",
        "Rất nóng",
        "Ưu tiên giảm tích nhiệt, thông gió và che nắng phù hợp; không bón phân đậm đặc để cố kích thích cây phục hồi.",
    )


def evaluate_humidity(rh: float, sustained_high_30m: bool = False) -> Tuple[str, str, str]:
    """Trả về (level, status, recommendation) cho DHT22 độ ẩm không khí (%RH)."""
    if rh < 40.0:
        return (
            "warning",
            "Không khí khô",
            "Kiểm tra độ ẩm đất và dấu hiệu héo. Nếu cây bị thiếu nước, tưới vào vùng rễ; không nhất thiết phải phun sương lên lá.",
        )
    if rh <= 50.0:
        return (
            "watch",
            "Khô tương đối",
            "Theo dõi cây, nhất là khi nhiệt độ cao. Duy trì nước ở vùng rễ và tránh gió nóng.",
        )
    if rh <= 70.0:
        return (
            "normal",
            "Thuận lợi",
            "Duy trì thông thoáng và theo dõi các cảm biến còn lại.",
        )
    if rh <= 80.0:
        return (
            "watch",
            "Ẩm cao tương đối",
            "Tăng lưu thông không khí, tránh tưới làm ướt lá vào chiều tối.",
        )
    if rh <= 85.0:
        rec = "Kiểm tra thông gió, tán lá quá rậm và tình trạng đọng nước."
        if sustained_high_30m:
            rec += " Độ ẩm cao kéo dài (>=30 phút): theo dõi dấu hiệu đốm lá, mốc sương."
        else:
            rec += " Theo dõi thêm thời gian duy trì ẩm cao trước khi kết luận nguy cơ bệnh."
        return ("warning", "Cảnh báo ẩm", rec)
    if rh <= 90.0:
        rec = "Tăng thông gió, tránh tưới phun lên tán lá và kiểm tra cây thường xuyên."
        if sustained_high_30m:
            rec += " Nguy cơ bệnh lá tăng do ẩm cao kéo dài (>=30 phút)."
        return ("high", "Nguy cơ cao khi kéo dài", rec)

    rec = "Kiểm tra đọng sương và lá ướt; ưu tiên giảm thời gian ẩm kéo dài, nhất là khi trời mát."
    if sustained_high_30m:
        rec += " Cảnh báo nguy cơ bệnh lá do độ ẩm rất cao kéo dài (>=30 phút)."
    return ("danger", "Rất ẩm", rec)


def evaluate_soil_moisture(soil_pct: float) -> Tuple[str, str, str]:
    """Trả về (level, status, recommendation) cho độ ẩm đất quy đổi (0–100%)."""
    if soil_pct <= 20.0:
        return (
            "danger",
            "Rất khô",
            "Kiểm tra đất tại vùng rễ. Nếu đất thực sự khô, tưới từ từ để nước thấm xuống rễ, tránh tưới quá nhiều một lần.",
        )
    if soil_pct <= 30.0:
        return (
            "warning",
            "Thiếu ẩm",
            "Kiểm tra nhu cầu nước của cây và độ khô của đất. Nếu đất khô, nên tưới bổ sung.",
        )
    if soil_pct <= 45.0:
        return (
            "watch",
            "Cần theo dõi",
            "Theo dõi xu hướng độ ẩm. Kiểm tra lại sau một khoảng thời gian, đặc biệt vào ngày nóng.",
        )
    if soil_pct <= 70.0:
        return (
            "normal",
            "Đủ ẩm tham khảo",
            "Duy trì theo dõi, chưa cần tưới chỉ vì đến một thời điểm cố định trong ngày.",
        )
    if soil_pct <= 85.0:
        return (
            "warning",
            "Ẩm cao",
            "Kiểm tra khả năng thoát nước và lượng nước tưới gần đây. Không tưới thêm nếu đất vẫn ướt.",
        )
    return (
        "danger",
        "Rất ẩm theo chỉ số",
        "Kiểm tra đất có bị úng hoặc đọng nước không. Giảm tưới nếu đất bão hòa; kiểm tra lỗ thoát nước.",
    )


def evaluate_light(lux: float, daytime: bool = True) -> Tuple[str, str, str]:
    """Trả về (level, status, recommendation) cho BH1750 (lux)."""
    if lux <= 100.0:
        if not daytime:
            return (
                "normal",
                "Rất tối (Ban đêm)",
                "Ban đêm mức lux thấp là bình thường; không cảnh báo thiếu sáng bất thường.",
            )
        return (
            "warning",
            "Rất tối",
            "Đang là ban ngày: kiểm tra cảm biến có bị che hoặc đặt trong bóng tối hay không.",
        )
    if lux <= 1000.0:
        if not daytime:
            return ("normal", "Ánh sáng rất thấp (Ban đêm)", "Mức sáng ban đêm bình thường.")
        return (
            "warning",
            "Ánh sáng rất thấp",
            "Nếu kéo dài trong ban ngày, kiểm tra mái che, vị trí cây và vật cản ánh sáng.",
        )
    if lux <= 5000.0:
        return (
            "watch" if daytime else "normal",
            "Ánh sáng thấp",
            "Đánh giá thời gian cây nhận được ánh sáng trực tiếp. Cân nhắc chuyển cây đến vị trí sáng hơn nếu phù hợp.",
        )
    if lux <= 10000.0:
        return (
            "normal",
            "Ánh sáng trung bình thấp",
            "Tiếp tục theo dõi, đặc biệt nếu cây đang phát triển thân lá hoặc ra hoa.",
        )
    if lux <= 40000.0:
        return (
            "normal",
            "Ánh sáng tốt theo ngưỡng vận hành",
            "Duy trì vị trí cây và theo dõi nhiệt độ để tránh tích nhiệt.",
        )
    if lux <= 60000.0:
        return (
            "watch",
            "Ánh sáng mạnh",
            "Kiểm tra nhiệt độ và dấu hiệu héo; chỉ che nắng khi điều kiện thực tế cho thấy cây bị nóng hoặc nắng gắt.",
        )
    return (
        "warning",
        "Ánh sáng rất mạnh",
        "Kiểm tra nhiệt độ, độ ẩm đất và biểu hiện cháy nắng. Không tự động kết luận cây bị hại chỉ dựa vào lux.",
    )


# ==========================================
# 4. ĐÁNH GIÁ KẾT HỢP 4 CẢM BIẾN
# ==========================================
def build_combined_assessment(
    temperature_c: float,
    humidity_rh: float,
    soil_adc: int | float,
    light_lux: float,
    timestamp_iso: Optional[str] = None,
    sustained_high_rh_30m: bool = False,
) -> Dict[str, Any]:
    soil_pct = convert_soil_adc_to_percent(soil_adc)
    daytime = is_daytime(timestamp_iso)

    t_lvl, t_status, t_rec = evaluate_temperature(temperature_c)
    h_lvl, h_status, h_rec = evaluate_humidity(humidity_rh, sustained_high_30m=sustained_high_rh_30m)
    s_lvl, s_status, s_rec = evaluate_soil_moisture(soil_pct)
    l_lvl, l_status, l_rec = evaluate_light(light_lux, daytime=daytime)

    alerts: List[str] = []
    combined_recs: List[str] = []
    overall_status = "Thuận lợi"

    # Trường hợp kết hợp đặc trưng
    if temperature_c > 32.0 and soil_pct <= 30.0:
        overall_status = "Cảnh báo nóng & thiếu ẩm đất"
        alerts.append("Nhiệt độ cao, đất có khả năng thiếu ẩm.")
        combined_recs.extend([
            "Kiểm tra độ khô ở vùng rễ và tưới nếu đất thực sự khô.",
            "Tăng thông gió, che nắng phù hợp vào thời điểm nóng nhất và theo dõi cây có héo hay không.",
        ])
    elif (humidity_rh > 85.0 or sustained_high_rh_30m) and soil_pct >= 85.0:
        overall_status = "Nguy cơ ẩm kéo dài & đất rất ướt"
        alerts.append("Điều kiện ẩm kéo dài, nguy cơ bệnh lá tăng.")
        combined_recs.extend([
            "Không tưới thêm khi đất còn bão hòa.",
            "Kiểm tra thoát nước, tăng thông gió và kiểm tra mặt dưới lá để phát hiện sớm đốm bất thường.",
        ])
    elif daytime and light_lux <= 5000.0:
        overall_status = "Ánh sáng thấp tương đối"
        alerts.append("Ánh sáng thấp tương đối trong ban ngày.")
        combined_recs.extend([
            "Kiểm tra cảm biến có bị che không, xem lại vị trí trồng và vật cản ánh sáng.",
            "Không tưới thêm chỉ vì ánh sáng thấp.",
        ])
    else:
        non_normal = [
            (t_lvl, f"Nhiệt độ: {t_status}", t_rec),
            (h_lvl, f"Độ ẩm không khí: {h_status}", h_rec),
            (s_lvl, f"Độ ẩm đất: {s_status}", s_rec),
            (l_lvl, f"Ánh sáng: {l_status}", l_rec),
        ]
        flagged = [item for item in non_normal if item[0] != "normal"]
        if not flagged:
            overall_status = "Thuận lợi"
            combined_recs.append("Tiếp tục giám sát, chưa cần can thiệp. Điều kiện thuận lợi không đồng nghĩa cây chắc chắn không có sâu bệnh.")
        else:
            overall_status = " | ".join(item[1] for item in flagged)
            for _, label_text, rec_text in flagged:
                alerts.append(label_text)
                if rec_text not in combined_recs:
                    combined_recs.append(rec_text)

    return {
        "soil_moisture_percent": soil_pct,
        "is_daytime": daytime,
        "sustained_high_rh_30m": sustained_high_rh_30m,
        "overall_status": overall_status,
        "alerts": alerts,
        "recommendations": combined_recs,
        "sensors": {
            "temperature_c": {"value": temperature_c, "level": t_lvl, "status": t_status, "recommendation": t_rec},
            "humidity_rh": {"value": humidity_rh, "level": h_lvl, "status": h_status, "recommendation": h_rec},
            "soil_moisture_pct": {"value": soil_pct, "adc": soil_adc, "level": s_lvl, "status": s_status, "recommendation": s_rec},
            "light_lux": {"value": light_lux, "level": l_lvl, "status": l_status, "recommendation": l_rec},
        },
    }