
import json
import argparse
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image
from rembg import remove, new_session


# ============================================================
# 1. PATH
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "model.onnx"
U2NET_PATH = BASE_DIR / "u2net.onnx"
CONFIG_PATH = BASE_DIR / "config.json"
CLASSES_PATH = BASE_DIR / "classes.json"

OUTPUT_DIR = BASE_DIR / "single_test_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# 2. CHECK FILES
# ============================================================

for path in [MODEL_PATH, U2NET_PATH, CONFIG_PATH, CLASSES_PATH]:
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {path}")


# ============================================================
# 3. LOAD CONFIG AND CLASSES
# ============================================================

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    config = json.load(f)

with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    class_data = json.load(f)

classes = class_data["classes"]

IMG_SIZE = config["img_size"]

MEAN = np.array(
    config["normalization"]["mean"],
    dtype=np.float32
)

STD = np.array(
    config["normalization"]["std"],
    dtype=np.float32
)

ALPHA_THRESHOLD = config["preprocessing"]["alpha_threshold"]
PADDING_RATIO = config["preprocessing"]["padding_ratio"]


# ============================================================
# 4. VALIDATE CONFIG AND CLASS MAPPING
# ============================================================

if len(MEAN) != 3 or len(STD) != 3:
    raise ValueError("Normalization phải có 3 giá trị RGB.")

if np.any(STD == 0):
    raise ValueError("STD không được bằng 0.")

if not 0 <= PADDING_RATIO < 0.5:
    raise ValueError("padding_ratio không hợp lệ.")

if len(classes) != config["num_classes"]:
    raise ValueError(
        "Số lớp trong classes.json không khớp config.json!"
    )

expected_mapping = {
    name: i for i, name in enumerate(classes)
}

saved_mapping = class_data["class_to_idx"]

if saved_mapping != expected_mapping:
    raise ValueError(
        "class_to_idx không khớp thứ tự classes trong classes.json!"
    )

print("CLASS MAPPING: PASSED")
print("Number of classes:", len(classes))
print("Image size:", IMG_SIZE)


# ============================================================
# 5. INITIALIZE U2-NET
# ============================================================

print("\nĐang khởi tạo U2-Net...")

session_rembg = new_session(
    "u2net",
    model_path=str(U2NET_PATH)
)

print("U2-Net READY")


# ============================================================
# 6. INITIALIZE EFFICIENTNET-B2
# ============================================================

print("\nĐang khởi tạo EfficientNet-B2...")

session_ai = ort.InferenceSession(
    str(MODEL_PATH),
    providers=["CPUExecutionProvider"]
)

input_info = session_ai.get_inputs()[0]
input_name = input_info.name

output_info = session_ai.get_outputs()[0]

print("EfficientNet READY")
print("Model input:", input_info.shape)
print("Model output:", output_info.shape)
print("Model classes:", len(classes))


# ============================================================
# 7. IMAGE PREPROCESSING
# MATCH TRAINING NOTEBOOK - CELL 32
# ============================================================

def preprocess_image(image_path):

    # --------------------------------------------------------
    # LOAD IMAGE
    # --------------------------------------------------------

    with Image.open(image_path) as img:
        image = img.convert("RGB")

    # --------------------------------------------------------
    # REMOVE BACKGROUND USING U2-NET
    # --------------------------------------------------------

    result = remove(
        image,
        session=session_rembg,
        post_process_mask=True
    ).convert("RGBA")

    # --------------------------------------------------------
    # EXTRACT ALPHA MASK
    # --------------------------------------------------------

    alpha = np.array(
        result.getchannel("A")
    )

    mask = alpha > ALPHA_THRESHOLD

    if not mask.any():
        raise ValueError(
            "Không tìm thấy vùng đối tượng sau khi tách nền."
        )

    ys, xs = np.where(mask)

    x_min = int(xs.min())
    x_max = int(xs.max()) + 1

    y_min = int(ys.min())
    y_max = int(ys.max()) + 1

    # --------------------------------------------------------
    # CROP LEAF
    # --------------------------------------------------------

    leaf = result.crop(
        (x_min, y_min, x_max, y_max)
    )

    w, h = leaf.size

    # --------------------------------------------------------
    # PADDING CALCULATION
    # SAME AS TRAINING
    # --------------------------------------------------------

    pad = int(max(w, h) * PADDING_RATIO)

    new_w = w + 2 * pad
    new_h = h + 2 * pad

    # --------------------------------------------------------
    # RESIZE
    # SAME AS TRAINING
    # --------------------------------------------------------

    scale = min(
        (IMG_SIZE - 16) / new_w,
        (IMG_SIZE - 16) / new_h
    )

    resized_w = max(1, int(w * scale))
    resized_h = max(1, int(h * scale))

    leaf = leaf.resize(
        (resized_w, resized_h),
        Image.Resampling.LANCZOS
    )

    # --------------------------------------------------------
    # WHITE BACKGROUND
    # SAME AS TRAINING
    # --------------------------------------------------------

    canvas = Image.new(
        "RGBA",
        (IMG_SIZE, IMG_SIZE),
        (255, 255, 255, 255)
    )

    x = (IMG_SIZE - resized_w) // 2
    y = (IMG_SIZE - resized_h) // 2

    canvas.alpha_composite(
        leaf,
        (x, y)
    )

    return canvas.convert("RGB")


# ============================================================
# 8. SOFTMAX
# ============================================================

def softmax(logits):

    logits = np.asarray(
        logits,
        dtype=np.float64
    )

    if not np.all(np.isfinite(logits)):
        raise ValueError(
            "Model output chứa giá trị không hợp lệ."
        )

    exp = np.exp(
        logits - np.max(logits)
    )

    return exp / np.sum(exp)


# ============================================================
# 9. PREDICT IMAGE
# ============================================================

def predict(image_path):

    print("\nĐang xử lý ảnh:", image_path.name)

    # --------------------------------------------------------
    # PREPROCESS
    # --------------------------------------------------------

    processed = preprocess_image(image_path)

    # --------------------------------------------------------
    # SAVE PROCESSED IMAGE
    # --------------------------------------------------------

    output_path = OUTPUT_DIR / (
        f"{image_path.stem}_processed.png"
    )

    processed.save(output_path)

    print("Đã lưu ảnh xử lý:", output_path)

    # --------------------------------------------------------
    # NORMALIZATION
    # SAME AS TRAINING
    # --------------------------------------------------------

    arr = np.asarray(
        processed,
        dtype=np.float32
    ) / 255.0

    arr = (arr - MEAN) / STD

    # HWC -> CHW
    arr = np.transpose(
        arr,
        (2, 0, 1)
    )

    # Add batch dimension
    arr = np.expand_dims(
        arr,
        axis=0
    ).astype(np.float32)

    # --------------------------------------------------------
    # ONNX INFERENCE
    # --------------------------------------------------------

    outputs = session_ai.run(
        None,
        {input_name: arr}
    )

    logits = outputs[0]

    if logits.ndim != 2 or logits.shape[0] != 1:
        raise ValueError(
            f"Output model không đúng định dạng: {logits.shape}"
        )

    logits = logits[0]

    if len(logits) != len(classes):
        raise ValueError(
            f"Số output model: {len(logits)}, "
            f"số class: {len(classes)}. "
            "Hãy kiểm tra classes.json và model.onnx."
        )

    # --------------------------------------------------------
    # SOFTMAX
    # --------------------------------------------------------

    probabilities = softmax(logits)

    # --------------------------------------------------------
    # TOP 3
    # --------------------------------------------------------

    top_indices = np.argsort(
        probabilities
    )[::-1][:3]

    print("\n========== TOP 3 DỰ ĐOÁN ==========")

    for rank, idx in enumerate(top_indices, start=1):

        class_name = classes[int(idx)]

        confidence = float(
            probabilities[idx]
        ) * 100

        print(
            f"Top {rank}: {class_name} "
            f"- {confidence:.2f}%"
        )

    # --------------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------------

    best_index = int(top_indices[0])

    predicted_class = classes[best_index]

    confidence = float(
        probabilities[best_index]
    ) * 100

    print("\n========== KẾT QUẢ ==========")

    if predicted_class == "Not_tomato":

        print(
            "AI nhận diện: "
            "Không phải lớp lá cà chua đã học."
        )

    else:

        print("Bệnh dự đoán:", predicted_class)

        print(
            f"Độ tin cậy: {confidence:.2f}%"
        )

    print("Ảnh sau xử lý:", output_path)
    print("=============================")


# ============================================================
# 10. MAIN
# ============================================================

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description="Tomato Leaf AI - Single Image Prediction"
    )

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
        raise FileNotFoundError(
            f"Không tìm thấy ảnh: {image_path}"
        )

    predict(image_path)
