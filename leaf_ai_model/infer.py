
import sys
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps, UnidentifiedImageError

# ==========================================
# 1. CAU HINH VA DUONG DAN
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "model.onnx"
CONFIG_PATH = BASE_DIR / "config.json"
CLASSES_PATH = BASE_DIR / "classes.json"

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    cfg = json.load(f)

with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    classes = json.load(f)

NOT = cfg["not_tomato_index"]

MIN_CONF = 0.60
MIN_MARGIN = 0.15

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# ==========================================
# 2. KIEM TRA CAU HINH
# ==========================================

if len(classes) != 11:
    raise ValueError("Model phai co 11 lop")

if not 0 <= NOT < len(classes):
    raise ValueError("not_tomato_index khong hop le")

if len(cfg["mean"]) != 3 or len(cfg["std"]) != 3:
    raise ValueError("mean va std phai co 3 gia tri")

if any(value <= 0 for value in cfg["std"]):
    raise ValueError("std phai lon hon 0")

if cfg["img_size"] != 256:
    raise ValueError("Kich thuoc anh phai la 256")

# ==========================================
# 3. KHOI TAO MODEL ONNX
# ==========================================

sess = ort.InferenceSession(
    str(MODEL_PATH),
    providers=["CPUExecutionProvider"]
)

INPUT_NAME = sess.get_inputs()[0].name

input_shape = sess.get_inputs()[0].shape
output_shape = sess.get_outputs()[0].shape

if input_shape[1:] != [3, 256, 256]:
    raise ValueError(
        f"Input model khong hop le: {input_shape}"
    )

if output_shape[-1] != len(classes):
    raise ValueError(
        "So lop output khong khop classes.json"
    )

# ==========================================
# 4. TIEN XU LY ANH
# ==========================================

def preprocess(image):
    """
    Chuan hoa anh dau vao:
    - Xu ly EXIF orientation
    - Xu ly PNG transparency
    - Chuyen ve RGB
    - Resize va crop 256x256
    - Chuan hoa mean/std
    - Dua ve dinh dang NCHW
    """

    img = ImageOps.exif_transpose(image)

    # Xu ly anh PNG co transparency
    if img.mode == "P" and "transparency" in img.info:
        img = img.convert("RGBA")

    # Anh co alpha duoc ghep len nen trang
    if img.mode in ("RGBA", "LA") or (
        img.mode == "P" and "transparency" in img.info
    ):
        rgba = img.convert("RGBA")
        background = Image.new(
            "RGBA",
            rgba.size,
            (255, 255, 255, 255)
        )
        img = Image.alpha_composite(background, rgba)
        img = img.convert("RGB")
    else:
        img = img.convert("RGB")

    # Resize va crop
    img = ImageOps.fit(
        img,
        (cfg["img_size"], cfg["img_size"]),
        method=Image.Resampling.BILINEAR
    )

    # Chuyen ve numpy
    x = np.asarray(
        img,
        dtype=np.float32
    ) / 255.0

    # Chuan hoa theo config
    mean = np.array(
        cfg["mean"],
        dtype=np.float32
    )

    std = np.array(
        cfg["std"],
        dtype=np.float32
    )

    x = (x - mean) / std

    # HWC -> CHW -> NCHW
    x = x.transpose(2, 0, 1)[None]

    return x.astype(np.float32)


# ==========================================
# 5. DU DOAN XAC SUAT
# ==========================================

def predict(image):
    """
    Dau vao:
        - Duong dan anh (str/Path)
        - Doi tuong PIL Image

    Dau ra:
        - Mang xac suat 11 lop
    """

    if isinstance(image, (str, Path)):

        path = Path(image)

        if not path.is_file():
            raise FileNotFoundError(
                f"Khong tim thay anh: {path}"
            )

        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Dinh dang anh khong duoc ho tro: {path.suffix}"
            )

        with Image.open(path) as img:
            x = preprocess(img)

    elif isinstance(image, Image.Image):
        x = preprocess(image)

    else:
        raise TypeError(
            "Dau vao phai la duong dan anh hoac PIL Image"
        )

    logits = sess.run(
        None,
        {INPUT_NAME: x}
    )[0][0]

    # Softmax on dinh so
    exp = np.exp(logits - np.max(logits))
    probabilities = exp / np.sum(exp)

    return probabilities


# ==========================================
# 6. QUYET DINH KET QUA
# ==========================================

def decide(probabilities):
    """
    Xac dinh ket qua:
    - Not_tomato
    - Khong chac chan
    - Ten benh
    """

    order = probabilities.argsort()[::-1]

    top_index = int(order[0])

    top = float(probabilities[order[0]])
    second = float(probabilities[order[1]])

    # Khong phai la ca chua
    if top_index == NOT:
        return "Không phải lá cà chua", top

    # Do tin cay thap hoac hai lop qua gan nhau
    if (
        top < MIN_CONF
        or top - second < MIN_MARGIN
    ):
        return "Không chắc, cần chụp lại", top

    return classes[top_index], top


# ==========================================
# 7. HAM DANH CHO BACKEND
# ==========================================

def predict_result(image):
    """
    Tra ve ket qua duoi dang dictionary
    de Backend Flask chuyen thanh JSON.
    """

    probabilities = predict(image)

    label, confidence = decide(probabilities)

    top_indices = probabilities.argsort()[::-1][:3]

    top3 = []

    for i in top_indices:
        top3.append({
            "label": classes[int(i)],
            "confidence": round(
                float(probabilities[i]),
                4
            )
        })

    # Thong tin chi tiet de danh gia AI
    top_index = int(probabilities.argmax())
    top_confidence = float(probabilities[top_index])

    return {
        "prediction": label,
        "confidence": round(confidence, 4),
        "top1_label": classes[top_index],
        "top1_confidence": round(top_confidence, 4),
        "is_rejected": (
            label == "Không chắc, cần chụp lại"
        ),
        "top3": top3
    }


# ==========================================
# 8. CHAY TU TERMINAL
# ==========================================

def main():

    if len(sys.argv) < 2:
        print("Cach su dung:")
        print(
            "python infer.py "
            "<duong_dan_anh_hoac_thu_muc>"
        )
        return

    paths = []

    for argument in sys.argv[1:]:

        path = Path(argument)

        if path.is_dir():

            paths.extend(
                sorted(
                    p for p in path.iterdir()
                    if p.is_file()
                    and p.suffix.lower()
                    in SUPPORTED_EXTENSIONS
                )
            )

        else:
            paths.append(path)

    if not paths:
        print("Khong tim thay anh de kiem tra.")
        return

    print("=" * 85)
    print("TOMATO AI - KET QUA NHAN DIEN")
    print("=" * 85)

    success_count = 0
    error_count = 0

    for path in paths:

        try:

            result = predict_result(path)

            top3_text = ", ".join(
                f"{item['label']} "
                f"{item['confidence']:.0%}"
                for item in result["top3"]
            )

            print(
                f"{path.name:25s} -> "
                f"{result['prediction']} "
                f"({result['confidence']:.2%})"
            )

            print(f"  Top 3: {top3_text}")

            success_count += 1

        except (
            FileNotFoundError,
            UnidentifiedImageError,
            OSError,
            ValueError,
            TypeError
        ) as error:

            print(f"Loi anh {path.name}: {error}")
            error_count += 1

    print("=" * 85)
    print(f"Xu ly thanh cong: {success_count}")
    print(f"Anh bi loi: {error_count}")
    print("=" * 85)


if __name__ == "__main__":
    main()
