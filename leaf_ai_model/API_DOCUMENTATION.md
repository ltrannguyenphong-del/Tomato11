# TOMATO11 – BACKEND API DOCUMENTATION

## 1. Tổng quan

Backend sử dụng Flask, kết nối mô hình EfficientNet-B2 thông qua ONNX Runtime và cơ sở dữ liệu SQLite.

**Base URL (local):** `http://127.0.0.1:5000`

## 2. API Health Check

**GET `/api/health`**

Kiểm tra trạng thái hoạt động của Backend.

Response thành công (HTTP 200):

```json
{
  "service": "Tomato11 Backend",
  "status": "ok",
  "version": "1.0.0"
}
```

## 3. API nhận diện bệnh lá cà chua

**POST `/api/predict`**

Content-Type: `multipart/form-data`

Trường dữ liệu:
- `image`: File JPG, JPEG hoặc PNG.
- Giới hạn request: 10 MB.

Response thành công (HTTP 200):

```json
{
  "success": true,
  "history_id": 1,
  "filename": "anht4.jpg",
  "prediction": "Tomato_Late_blight",
  "confidence": 0.8539,
  "top1_label": "Tomato_Late_blight",
  "top1_confidence": 0.8539,
  "is_rejected": false,
  "top3": [
    {
      "label": "Tomato_Late_blight",
      "confidence": 0.8539
    },
    {
      "label": "Tomato_Early_blight",
      "confidence": 0.029
    },
    {
      "label": "Tomato_Bacterial_spot",
      "confidence": 0.0288
    }
  ]
}
```

Các giá trị trên là ví dụ từ lần kiểm thử trước.

Các mã lỗi:
- 400: Thiếu ảnh, định dạng không hợp lệ hoặc ảnh bị lỗi.
- 413: Request vượt giới hạn dung lượng.
- 500: Lỗi xử lý Backend.

## 4. API danh sách lịch sử

**GET `/api/history`**

Tham số:

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `page` | 1 | Trang hiện tại |
| `per_page` | 10 | Số bản ghi mỗi trang, tối đa 100 |
| `sort` | desc | Sắp xếp `asc` hoặc `desc` theo thời gian |

Ví dụ:

`GET /api/history?page=1&per_page=10&sort=desc`

Response gồm:
- `success`
- `items`
- `total`
- `page`
- `per_page`
- `total_pages`
- `sort`

## 5. API chi tiết lịch sử

**GET `/api/history/{id}`**

Trả về chi tiết kết quả nhận diện theo ID.

Response thành công (HTTP 200) gồm:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "anht4.jpg",
    "predicted_label": "Tomato_Late_blight",
    "confidence": 0.8539,
    "top1_label": "Tomato_Late_blight",
    "is_rejected": false,
    "top3": [],
    "created_at": "2026-11-07T10:35:20.833Z"
  }
}
```

`top3` trong ví dụ được rút gọn; API thực tế trả về ba dự đoán đã lưu.

Nếu ID không tồn tại, trả HTTP 404.

## 6. Cơ sở dữ liệu

SQLite database: `backend/tomato.db`

Bảng: `prediction_history`

Các trường chính:
- id
- filename
- image_path
- predicted_label
- confidence
- top1_label
- top3_json
- is_rejected
- created_at

Thời gian `created_at` được lưu theo UTC.

## 7. Hướng dẫn chạy Backend

Từ thư mục gốc dự án:

```powershell
python -m pip install -r requirements.txt
python -m pip install flask flask-cors
python -m backend.app
```

Đây là cấu hình phát triển local, không sử dụng Flask debug server cho production.

## 8. Ghi chú tích hợp Frontend

Frontend gửi ảnh bằng `FormData` với key `image`.

Sau khi nhận kết quả:
1. Kiểm tra `success`.
2. Hiển thị `prediction`, `confidence` và `top3`.
3. Nếu `is_rejected = true`, thông báo người dùng chụp lại ảnh.
4. Sử dụng `history_id` để truy vấn chi tiết.
5. Sử dụng `/api/history` để hiển thị lịch sử.

Hiện tại Backend chưa cung cấp API riêng để tải ảnh đã lưu hoặc cơ chế xác thực người dùng. Các chức năng đó cần được thống nhất trước khi triển khai công khai.
