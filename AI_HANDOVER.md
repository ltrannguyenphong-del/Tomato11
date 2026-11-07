# AI HANDOVER – TOMATO11

## 1. Thông tin mô hình

**Đề tài:** Hệ thống giám sát vi khí hậu, chẩn đoán và cảnh báo sớm bệnh lá cà chua.

- Kiến trúc mô hình: EfficientNet-B2 (theo `config.json`)
- Định dạng: ONNX
- File mô hình: `model.onnx`
- Framework suy luận: ONNX Runtime
- Kích thước đầu vào: `[batch, 3, 256, 256]`
- Kiểu dữ liệu: `float32`
- Đầu ra: `[batch, 11]`
- Số lớp: 11

## 2. Danh sách lớp nhận diện

| Index | Nhãn |
|---|---|
| 0 | Tomato_Bacterial_spot |
| 1 | Tomato_Early_blight |
| 2 | Tomato_Late_blight |
| 3 | Tomato_Leaf_Mold |
| 4 | Tomato_Septoria_leaf_spot |
| 5 | Tomato_Spider_mites_Two_spotted_spider_mite |
| 6 | Tomato__Target_Spot |
| 7 | Tomato__Tomato_YellowLeaf__Curl_Virus |
| 8 | Tomato__Tomato_mosaic_virus |
| 9 | Tomato_healthy |
| 10 | Not_tomato |

## 3. Tiền xử lý ảnh

Ảnh đầu vào trải qua các bước:

1. Đọc ảnh JPG, JPEG hoặc PNG.
2. Điều chỉnh hướng ảnh theo EXIF.
3. Xử lý ảnh PNG có transparency và chuyển sang RGB.
4. Resize và crop thành 256 × 256 pixel.
5. Chuyển giá trị pixel về khoảng `[0, 1]`.
6. Chuẩn hóa theo cấu hình:

   - Mean: `[0.485, 0.456, 0.406]`
   - Std: `[0.229, 0.224, 0.225]`

7. Chuyển dữ liệu sang định dạng NCHW và `float32`.

## 4. Cấu hình ngưỡng dự đoán

Thông số hiện tại:

- `MIN_CONF = 0.60`
- `MIN_MARGIN = 0.15`

Quy tắc xử lý:

- Nếu lớp Top 1 là `Not_tomato`, trả về "Không phải lá cà chua".
- Nếu confidence thấp hơn 0.60 hoặc chênh lệch xác suất Top 1 và Top 2 thấp hơn 0.15, trả về "Không chắc, cần chụp lại".
- Các trường hợp còn lại trả về tên lớp dự đoán.

Lưu ý: Logic hiện tại không áp dụng hai ngưỡng trên cho `Not_tomato`.

## 5. Hướng dẫn cài đặt

Tại thư mục gốc dự án, cài thư viện:

```powershell
python -m pip install -r requirements.txt
```

Nếu sử dụng môi trường ảo `.venv` trên Windows:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## 6. Hướng dẫn sử dụng mô hình

Chạy dự đoán bằng Terminal:

```powershell
.\.venv\Scripts\python.exe infer.py anh_that
```

Gọi mô hình trong Backend Python:

```python
from infer import predict_result

result = predict_result("anh_that/anht4.jpg")
print(result)
```

Hàm `predict_result(image)` nhận đường dẫn ảnh hoặc đối tượng PIL Image và trả về Dictionary có thể chuyển thành JSON.

Các trường dữ liệu gồm:

- `prediction`: Kết quả cuối cùng sau khi áp dụng ngưỡng.
- `confidence`: Độ tin cậy Top 1.
- `top1_label`: Lớp có xác suất cao nhất.
- `top1_confidence`: Xác suất Top 1.
- `is_rejected`: Trạng thái từ chối dự đoán.
- `top3`: Ba lớp có xác suất cao nhất.

## 7. Kết quả kiểm thử nội bộ

Đã kiểm thử 208 ảnh, gồm 201 ảnh có nhãn và 7 ảnh chưa xác định nhãn.

Với `MIN_CONF = 0.60` và `MIN_MARGIN = 0.15`:

| Chỉ số | Kết quả |
|---|---:|
| Ảnh có nhãn | 201 |
| Dự đoán đúng | 133 |
| Dự đoán sai | 38 |
| Từ chối dự đoán | 30 |
| Accuracy trên ảnh được chấp nhận | 77,78% |
| Tỷ lệ đúng trên toàn bộ ảnh có nhãn | 66,17% |
| Coverage | 85,07% |
| Rejection Rate | 14,93% |

Đã thử 12 tổ hợp ngưỡng confidence và margin trong AI-05. Ngưỡng 0.60/0.15 được giữ làm cấu hình thử nghiệm hiện tại, chưa khẳng định tối ưu.

**Giới hạn:** Chưa xác minh toàn bộ dữ liệu kiểm thử độc lập với dữ liệu huấn luyện Kaggle. Do đó các chỉ số trên là kết quả kiểm thử nội bộ, không phải kết luận hiệu năng tổng quát.

## 8. Các file bàn giao

| File | Chức năng |
|---|---|
| `model.onnx` | Mô hình AI đã huấn luyện |
| `infer.py` | Tiền xử lý và suy luận |
| `config.json` | Cấu hình mô hình |
| `classes.json` | Danh sách nhãn |
| `requirements.txt` | Thư viện chạy suy luận |
| `requirements-eval.txt` | Thư viện đánh giá |
| `test_ai.py` | Kiểm thử ảnh và đối chiếu nhãn |
| `evaluate_ai.py` | Tính các chỉ số đánh giá |
| `threshold_test.py` | Kiểm thử ngưỡng |
| `prepare_dataset.py` | Chuẩn bị dữ liệu kiểm thử |

## 9. Lưu ý khi tích hợp Backend

- Khởi tạo `InferenceSession` một lần, tránh tải lại mô hình cho mỗi request.
- Kiểm tra định dạng, kích thước và nội dung file ảnh trước khi suy luận.
- Có thể sử dụng PIL Image để truyền ảnh từ Flask sang `predict_result()`.
- Không tự động xem kết quả AI là chẩn đoán bệnh đã được xác minh.
- Nên lưu ảnh, thời gian, kết quả dự đoán và trạng thái từ chối vào cơ sở dữ liệu.
- Không công khai đường dẫn file nội bộ hoặc traceback trong API.
- Kiểm tra lại độ chính xác với ảnh thực tế độc lập trước khi triển khai chính thức.

## 10. Tình trạng bàn giao

Module AI đã chạy được trên máy local, xuất kết quả theo cấu trúc phù hợp cho Backend. Việc tích hợp API Flask và kiểm thử đầu-cuối với Frontend sẽ được thực hiện trong các task Backend tiếp theo.