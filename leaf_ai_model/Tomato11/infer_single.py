
import json
import argparse
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps
from rembg import remove, new_session

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "model.onnx"
U2NET_PATH = BASE_DIR / "u2net.onnx"
CONFIG_PATH = BASE_DIR / "config.json"
CLASSES_PATH = BASE_DIR / "classes.json"

OUTPUT_DIR = BASE_DIR / "single_test_output"
OUTPUT_DIR.mkdir(exist_ok=True)

# Đọc cấu hình
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = json.load(f)

with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    class_data = json.load(f)

classes = class_data["classes"]
IMG_SIZE = config["img_size"]
MEAN = np.array(config["normalization"]["mean"], dtype=np.float32)
STD = np.array(config["normalization"]["std"], dtype=np.float32)

# Khởi tạo mô hình
print("Đang khởi tạo U2-Net...")
session_rembg = new_session("u2net")
print("U2-Net READY")

print("Đang khởi tạo EfficientNet-B2...")
session_ai = ort.InferenceSession(
    str(MODEL_PATH),
    providers=["CPUExecutionProvider"]
)
input_name = session_ai.get_inputs()[0].name
print("EfficientNet READY")


def preprocess_image(image_path):
    image = Image.open(image_path)
    image = ImageOps.exif_transpose(image).convert("RGB")

    # Tách nền
    result = remove(
        image,
        session=session_rembg,
        post_process_mask=True
    )

    rgba = result.convert("RGBA")
    rgba_np = np.array(rgba)

    # Lấy vùng lá theo alpha
    alpha = rgba_np[:, :, 3]
    threshold = config["preprocessing"]["alpha_threshold"]
    mask = alpha > threshold

    if not np.any(mask):
        raise ValueError("Không tìm thấy vùng đối tượng sau khi tách nền.")

    ys, xs = np.where(mask)
    x1, x2 = xs.min(), xs.max() + 1
    y1, y2 = ys.min(), ys.max() + 1

    leaf = rgba.crop((x1, y1, x2, y2)).convert("RGB")

    # Đưa đối tượng lên nền trắng
    padding = config["preprocessing"]["padding_ratio"]
    max_size = IMG_SIZE * (1 - 2 * padding)

    scale = min(
        max_size / leaf.width,
        max_size / leaf.height
    )

    new_w = max(1, int(leaf.width * scale))
    new_h = max(1, int(leaf.height * scale))

    leaf = leaf.resize((new_w, new_h), Image.Resampling.BILINEAR)

    canvas = Image.new("RGB", (IMG_SIZE, IMG_SIZE), (255, 255, 255))
    x = (IMG_SIZE - new_w) // 2
    y = (IMG_SIZE - new_h) // 2
    canvas.paste(leaf, (x, y))

    return canvas


def predict(image_path):
    print("\nĐang xử lý ảnh:", image_path.name)

    processed = preprocess_image(image_path)

    # Lưu ảnh đã tách nền
    output_path = OUTPUT_DIR / f"{image_path.stem}_processed.png"
    processed.save(output_path)

    # Chuẩn hóa ảnh
    arr = np.asarray(processed, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    arr = np.transpose(arr, (2, 0, 1))
    arr = np.expand_dims(arr, axis=0).astype(np.float32)

    # Dự đoán
    outputs = session_ai.run(None, {input_name: arr})
    logits = outputs[0][0]

    exp = np.exp(logits - np.max(logits))
    probabilities = exp / exp.sum()

    index = int(np.argmax(probabilities))
    confidence = float(probabilities[index]) * 100
    predicted_class = classes[index]

    print("\n========== KẾT QUẢ ==========")

    if predicted_class == "Not_tomato":
        print("AI nhận diện: Không phải lớp lá cà chua đã học.")
    else:
        print("Bệnh dự đoán:", predicted_class)
        print(f"Độ tin cậy: {confidence:.2f}%")

    print("Ảnh sau xử lý:", output_path)
    print("=============================")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--image",
        type=str,
        required=True,
        help="Đường dẫn ảnh cần kiểm tra"
    )

    args = parser.parse_args()
    image_path = Path(args.image)

    if not image_path.is_absolute():
        image_path = BASE_DIR / image_path

    if not image_path.exists():
        raise FileNotFoundError(f"Không tìm thấy ảnh: {image_path}")

    predict(image_path)
