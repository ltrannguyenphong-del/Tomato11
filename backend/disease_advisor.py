from typing import Dict, Any

DISEASE_ADVICE_MAP: Dict[str, Dict[str, Any]] = {
    "Tomato_Bacterial_spot": {
        "vi_name": "Bệnh đốm vi khuẩn",
        "category": "Bệnh do vi khuẩn",
        "priority": "Trung bình – Cao",
        "signs": [
            "Các đốm nhỏ màu nâu sẫm hoặc đen.",
            "Có thể có quầng vàng quanh đốm.",
            "Mô lá bị tổn thương, đôi khi phần giữa đốm khô hoặc rụng.",
            "Bệnh có thể lan mạnh khi lá thường xuyên ướt, mưa tạt hoặc tưới phun lên tán lá.",
        ],
        "solutions": [
            "Kiểm tra mặt trên và mặt dưới lá, thân và quả để xác định phạm vi tổn thương.",
            "Tỉa bỏ những lá bị bệnh nặng khi cần thiết; thu gom và loại bỏ tàn dư bệnh khỏi khu vực trồng.",
            "Tưới nước ở gốc, ưu tiên tưới nhỏ giọt; tránh làm ướt lá kéo dài.",
            "Vệ sinh dụng cụ, tránh thao tác trên cây ướt rồi chuyển sang cây khỏe.",
            "Sử dụng hạt giống, cây giống sạch bệnh và luân canh phù hợp.",
        ],
        "note": "Đây là bệnh do vi khuẩn, không nên mặc định thuốc trừ nấm thông thường sẽ điều trị được. Nếu cần sử dụng chế phẩm bảo vệ thực vật, phải chọn sản phẩm được phép sử dụng cho cà chua tại địa phương và tuân thủ nhãn.",
        "source": "University of Minnesota Extension",
    },
    "Tomato_Early_blight": {
        "vi_name": "Bệnh cháy lá sớm",
        "category": "Bệnh nấm",
        "priority": "Trung bình",
        "signs": [
            "Đốm nâu hoặc đen, thường xuất hiện ở lá già phía dưới trước.",
            "Đốm lớn có các vòng đồng tâm giống hình bia bắn.",
            "Vùng quanh đốm có thể vàng, lá nặng có thể khô và rụng.",
        ],
        "solutions": [
            "Loại bỏ lá nhiễm bệnh nặng, không tỉa quá nhiều lá trong một lần.",
            "Phủ mặt đất bằng vật liệu thích hợp để hạn chế đất và bào tử bắn lên lá.",
            "Tạo khoảng cách, làm giàn và tỉa tán hợp lý để tăng thông thoáng.",
            "Tưới tại gốc, tránh để lá ướt lâu.",
            "Luân canh với cây không thuộc nhóm ký chủ phù hợp theo hướng dẫn canh tác địa phương.",
            "Khi bệnh tiếp tục lan: kiểm tra tốc độ xuất hiện đốm mới và mức độ rụng lá. Nếu cân nhắc thuốc bảo vệ thực vật, chỉ sử dụng sản phẩm được đăng ký phù hợp, theo đúng nhãn và thời gian cách ly.",
        ],
        "note": "Các bệnh đốm lá có thể có triệu chứng tương tự nhau nên cần kiểm tra thêm trên cây thật.",
        "source": "University of Minnesota Extension",
    },
    "Tomato_Late_blight": {
        "vi_name": "Bệnh mốc sương / cháy lá muộn",
        "category": "Bệnh nấm / giả nấm",
        "priority": "Cao",
        "signs": [
            "Vết bệnh bất quy tắc, có vẻ úng nước, sau chuyển nâu sẫm.",
            "Tổn thương có thể lan nhanh trên lá, cuống và thân.",
            "Trong điều kiện ẩm ướt, có thể xuất hiện lớp sinh trưởng màu trắng ở rìa vết bệnh hoặc mặt dưới lá.",
        ],
        "solutions": [
            "Ưu tiên kiểm tra ngay nếu vết bệnh lan nhanh, đặc biệt sau thời kỳ mưa hoặc ẩm ướt kéo dài.",
            "Hạn chế di chuyển từ cây nghi bệnh sang cây khỏe; vệ sinh dụng cụ và thu gom tàn dư nhiễm bệnh.",
            "Hạn chế tưới lên tán lá, tăng thông thoáng và theo dõi các cây lân cận.",
            "Nếu có dấu hiệu nghiêm trọng, liên hệ cán bộ bảo vệ thực vật để xác minh và lựa chọn biện pháp kiểm soát phù hợp.",
            "Nếu cần dùng thuốc, chọn sản phẩm được đăng ký cho bệnh này trên cà chua, tuân thủ nhãn và hướng dẫn địa phương.",
        ],
        "note": "Mức ưu tiên đề xuất cho hệ thống: Cao. Bệnh này có thể phát triển và lây lan nhanh trong điều kiện thuận lợi, vì vậy cần kiểm tra sớm. Mức ưu tiên là quy tắc vận hành của website, không phải kết luận chắc chắn từ một ảnh đơn lẻ.",
        "source": "University of Minnesota Extension",
    },
    "Tomato_Leaf_Mold": {
        "vi_name": "Bệnh mốc lá",
        "category": "Bệnh nấm",
        "priority": "Trung bình",
        "signs": [
            "Đốm vàng nhạt hoặc vàng xanh trên mặt trên lá.",
            "Mặt dưới tương ứng có thể xuất hiện lớp mốc màu ôliu hoặc nâu.",
            "Thường ảnh hưởng đến lá già trước, nhất là nơi thông gió kém và độ ẩm cao.",
        ],
        "solutions": [
            "Kiểm tra mặt dưới lá để phân biệt với các bệnh đốm lá khác.",
            "Tăng thông gió trong nhà kính hoặc khu trồng có mái che.",
            "Giảm thời gian lá bị ướt và tránh tưới phun vào buổi chiều tối.",
            "Tỉa bỏ phần lá bệnh nặng, thu gom tàn dư.",
            "Theo dõi độ ẩm không khí liên tục và đối chiếu với lịch sử môi trường.",
        ],
        "note": "Liên kết với IoT: nếu cảm biến ghi nhận độ ẩm không khí cao kéo dài, hệ thống có thể đưa ra cảnh báo “Điều kiện ẩm thuận lợi cho mốc lá” thay vì tự kết luận bệnh đã phát triển do độ ẩm cao.",
        "source": "University of Minnesota Extension",
    },
    "Tomato_Septoria_leaf_spot": {
        "vi_name": "Bệnh đốm lá Septoria",
        "category": "Bệnh nấm",
        "priority": "Trung bình",
        "signs": [
            "Nhiều đốm nhỏ hình tròn, tâm xám hoặc nâu nhạt, viền sẫm.",
            "Có thể thấy các chấm đen li ti trong đốm khi quan sát kỹ.",
            "Thường xuất hiện ở lá phía dưới rồi lan dần lên trên trong điều kiện thuận lợi.",
        ],
        "solutions": [
            "Quan sát kỹ kích thước, viền và tâm của các đốm.",
            "Thu gom lá bệnh, tránh để tàn dư nhiễm bệnh tồn tại dưới gốc.",
            "Dùng lớp phủ mặt đất để hạn chế đất bắn lên lá.",
            "Tăng thông thoáng, tưới tại gốc và không thao tác khi lá đang ướt.",
            "Theo dõi số lá bị ảnh hưởng và sự xuất hiện của đốm mới.",
        ],
        "note": "Không nên phân biệt Septoria với cháy lá sớm chỉ bằng một tiêu chí. Nếu ảnh không rõ hoặc triệu chứng chồng lấn, website nên đề nghị chụp thêm ảnh và kiểm tra thực tế.",
        "source": "University of Maryland Extension",
    },
    "Tomato_Spider_mites_Two_spotted_spider_mite": {
        "vi_name": "Nhện đỏ hai chấm",
        "category": "Nhện hại / Sâu hại",
        "priority": "Trung bình",
        "signs": [
            "Nhiều chấm vàng hoặc trắng li ti trên lá.",
            "Lá có thể chuyển vàng đồng đều khi mật độ nhện tăng.",
            "Có thể xuất hiện tơ mảnh và nhện rất nhỏ ở mặt dưới lá.",
        ],
        "solutions": [
            "Kiểm tra mặt dưới lá bằng kính lúp, tìm nhện, trứng và tơ mảnh.",
            "Loại bỏ lá bị hại nghiêm trọng khi phù hợp.",
            "Kiểm tra các cây lân cận để xác định phạm vi.",
            "Hạn chế tình trạng cây bị thiếu nước; duy trì chăm sóc phù hợp.",
            "Bảo vệ thiên địch có ích và tránh phun thuốc tràn lan làm mất cân bằng sinh học.",
            "Nếu mật độ nhện tăng, lựa chọn biện pháp kiểm soát phù hợp với cây cà chua và nhãn sản phẩm.",
        ],
        "note": "Đây là côn trùng/động vật gây hại chứ không phải bệnh nấm hay vi khuẩn. Cần hiển thị nhóm “Sâu hại” hoặc “Nhện hại” để tránh nhầm phương pháp xử lý.",
        "source": "University of Maryland Extension",
    },
    "Tomato__Target_Spot": {
        "vi_name": "Bệnh đốm vòng mục tiêu",
        "category": "Bệnh nấm",
        "priority": "Trung bình",
        "signs": [
            "Đốm nâu trên lá, có thể có các vòng đồng tâm.",
            "Vết bệnh có thể lan rộng, làm mô lá vàng và khô.",
            "Có thể nhầm với cháy lá sớm do cùng xuất hiện những đốm có dạng vòng.",
        ],
        "solutions": [
            "Chụp ảnh rõ cả mặt trên và mặt dưới lá, ghi nhận vị trí và mức độ tổn thương.",
            "Loại bỏ lá bệnh nặng và thu gom tàn dư thực vật.",
            "Tăng thông thoáng, tưới tại gốc và hạn chế lá ướt kéo dài.",
            "Theo dõi sự xuất hiện của các đốm mới ở những lá khác.",
            "Nếu bệnh lan rộng, xác minh nguyên nhân trước khi chọn thuốc kiểm soát nấm phù hợp.",
        ],
        "note": "Vì Target Spot và Early Blight có thể có hình ảnh tương tự, không nên đưa ra hai phác đồ thuốc khác nhau chỉ dựa vào nhãn AI.",
        "source": "NC State Extension",
    },
    "Tomato__Tomato_YellowLeaf__Curl_Virus": {
        "vi_name": "Bệnh xoăn vàng lá cà chua",
        "category": "Bệnh virus",
        "priority": "Cao",
        "signs": [
            "Lá non vàng, cong hoặc cuốn lên.",
            "Phiến lá có thể nhỏ, biến dạng.",
            "Cây còi cọc, sinh trưởng kém, giảm khả năng đậu quả.",
            "Bệnh có liên quan đến virus được truyền chủ yếu bởi bọ phấn trắng.",
        ],
        "solutions": [
            "Kiểm tra lá non và mặt dưới lá, tìm bọ phấn trắng.",
            "Kiểm tra các cây xung quanh để phát hiện cây có biểu hiện tương tự.",
            "Hạn chế bọ phấn trắng bằng biện pháp quản lý dịch hại tổng hợp phù hợp.",
            "Sử dụng cây giống sạch bệnh và giống có khả năng kháng virus nếu phù hợp.",
            "Nếu nghi nhiễm nặng, cách ly thao tác chăm sóc và nhờ chuyên gia xác minh.",
            "Khi xác nhận cây nhiễm virus, cân nhắc loại bỏ cây bệnh theo hướng dẫn chuyên môn để giảm nguồn lây.",
        ],
        "note": "Thuốc trừ nấm không chữa được bệnh do virus. Việc kiểm soát côn trùng môi giới giúp hạn chế lây lan nhưng không chữa khỏi cây đã nhiễm virus.",
        "source": "University of Minnesota Extension",
    },
    "Tomato__Tomato_mosaic_virus": {
        "vi_name": "Bệnh khảm lá cà chua",
        "category": "Bệnh virus",
        "priority": "Cao",
        "signs": [
            "Mảng xanh đậm và xanh nhạt xen kẽ trên lá.",
            "Lá có thể nhăn, biến dạng hoặc phát triển không đồng đều.",
            "Cây có thể còi cọc; mức độ biểu hiện phụ thuộc giống và điều kiện trồng.",
        ],
        "solutions": [
            "Tách riêng việc chăm sóc cây nghi nhiễm để hạn chế lây qua tay và dụng cụ.",
            "Rửa tay và vệ sinh dụng cụ sau khi tiếp xúc với cây nghi nhiễm.",
            "Không sử dụng hạt giống từ cây nghi bệnh.",
            "Kiểm tra nguồn cây giống và vệ sinh khu vực trồng.",
            "Xác minh với chuyên gia khi cần phân biệt virus với thiếu dinh dưỡng, tổn thương hóa chất hoặc các nguyên nhân khác.",
        ],
        "note": "Virus khảm lá không có biện pháp chữa khỏi cây đã nhiễm bằng thuốc trừ nấm. Khi xác nhận nhiễm, cần tập trung vào ngăn ngừa lây lan và xử lý cây bệnh theo hướng dẫn chuyên môn.",
        "source": "University of Minnesota Extension",
    },
    "Tomato_healthy": {
        "vi_name": "Lá cà chua khỏe mạnh",
        "category": "Chưa phát hiện dấu hiệu bệnh",
        "priority": "Bình thường",
        "signs": [
            "Mô hình đánh giá ảnh gần với lớp lá khỏe mạnh trong tập huấn luyện.",
            "Đây không phải bằng chứng rằng toàn bộ cây không có bệnh, sâu hại hoặc vấn đề ở rễ.",
        ],
        "solutions": [
            "Tiếp tục theo dõi bốn thông số môi trường.",
            "Kiểm tra mặt dưới lá và thân cây định kỳ.",
            "Duy trì thông thoáng, tưới phù hợp và vệ sinh khu vực trồng.",
            "Chụp ảnh mới nếu phát hiện biến đổi màu sắc, đốm lá hoặc lá biến dạng.",
            "Không phun thuốc phòng bệnh chỉ vì mục đích phòng ngừa nếu chưa có căn cứ cần thiết.",
        ],
        "note": "Chưa phát hiện dấu hiệu thuộc các lớp bệnh đã huấn luyện.",
        "source": "Khuyến nông & IPM",
    },
    "Not_tomato": {
        "vi_name": "Ảnh không phải lá cà chua",
        "category": "Đầu vào không phải lá cà chua",
        "priority": "Kiểm tra lại ảnh",
        "signs": [
            "Ảnh đầu vào được mô hình phân loại vào lớp không phải cà chua.",
            "Đây là lớp từ chối đầu vào không phù hợp, không phải bệnh cây.",
        ],
        "solutions": [
            "Ảnh có thể không phải lá cà chua hoặc chưa đủ điều kiện để phân tích.",
            "Tải ảnh mới, chụp một lá cà chua rõ nét, đủ sáng và không bị che khuất.",
            "Nếu ảnh thực sự là lá cà chua nhưng vẫn bị phân loại sai, lưu lại trường hợp để đánh giá mô hình.",
        ],
        "note": "Không hiển thị tên bệnh hoặc hướng dẫn sử dụng thuốc cho lớp này. Một lớp Not_tomato không đảm bảo mô hình từ chối được mọi loại ảnh ngoài tập huấn luyện.",
        "source": "Kiểm soát chất lượng đầu vào",
    },
}


def get_disease_advice(label: str) -> Dict[str, Any]:
    clean_label = (label or "").strip()
    if clean_label in DISEASE_ADVICE_MAP:
        info = DISEASE_ADVICE_MAP[clean_label]
        return {
            "label": clean_label,
            "vi_name": info["vi_name"],
            "category": info["category"],
            "priority": info["priority"],
            "signs": info["signs"],
            "solutions": info["solutions"],
            "note": info["note"],
            "source": info["source"],
        }

    return {
        "label": clean_label or "Unknown",
        "vi_name": "Chưa có mô tả cho lớp này",
        "category": "Cần kiểm tra thêm",
        "priority": "Theo dõi",
        "signs": ["Cần kiểm tra trực tiếp trên lá và thân cây cà chua."],
        "solutions": ["Chụp ảnh rõ nét hơn và đối chiếu triệu chứng thực tế tại vườn."],
        "note": "Kết quả mang tính tham khảo từ mô hình AI.",
        "source": "IPM tham khảo",
    }