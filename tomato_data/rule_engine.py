# rule_engine.py

def evaluate_tomato_environment(temp, humidity, soil_adc, light_lux):
    """
    Đánh giá vi khí hậu cho cây cà chua dựa trên bộ quy tắc ngưỡng nông học.
    Trả về: status ('Normal' hoặc 'Warning'), và danh sách các cảnh báo chi tiết.
    """
    warnings = []
    status = "Normal"
    
    # 1. Kiểm tra nhiệt độ (Ngưỡng tối ưu sinh trưởng cà chua: 20°C - 32°C)
    if temp > 32:
        warnings.append(f"Nhiệt độ cao ({temp}°C): Nguy cơ héo rũ, giảm đậu quả.")
        status = "Warning"
    elif temp < 15:
        warnings.append(f"Nhiệt độ thấp ({temp}°C): Cây sinh trưởng chậm.")
        status = "Warning"
        
    # 2. Kiểm tra độ ẩm không khí (Độ ẩm > 85% kéo dài là điều kiện thuận lợi cho nấm bệnh phát sinh)
    if humidity > 85:
        warnings.append(f"Độ ẩm không khí cao ({humidity}%): Nguy cơ phát sinh nấm bệnh lá (Early/Late Blight).")
        status = "Warning"
    elif humidity < 50:
        warnings.append(f"Độ ẩm không khí thấp ({humidity}%): Cây dễ mất nước, khô mép lá.")
        
    # 3. Kiểm tra độ ẩm đất qua cảm biến ADC (SMS-V1.2: 0 - 4095)
    if soil_adc > 3000:
        warnings.append(f"Đất thiếu nước (ADC: {soil_adc}): Cần kích hoạt hệ thống tưới.")
        status = "Warning"
    elif soil_adc < 1000:
        warnings.append(f"Đất quá ẩm (ADC: {soil_adc}): Nguy cơ thối rễ.")
        status = "Warning"
        
    # 4. Kiểm tra ánh sáng
    if light_lux < 200:
        warnings.append(f"Cường độ ánh sáng thấp ({light_lux} lux): Thiếu sáng cho quang hợp.")
        
    return status, warnings