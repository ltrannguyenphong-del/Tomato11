
import os
import json
import argparse

import torch
import torch.nn.functional as F
import timm

from PIL import Image, ImageOps
from torchvision import transforms


# =========================================================
# 1. CONFIGURATION
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "best_model.pth")
CLASSES_PATH = os.path.join(BASE_DIR, "classes.json")
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Default rejection thresholds.
# Config.json can override these values.
DEFAULT_MIN_CONF = 0.60
DEFAULT_MIN_MARGIN = 0.15

PAD_COLOR = (114, 114, 114)


# =========================================================
# 2. LOAD CONFIGURATION AND CLASS MAPPING
# =========================================================

def load_json(path):
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Không tìm thấy file: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


config = load_json(CONFIG_PATH)
classes_data = load_json(CLASSES_PATH)


def get_class_names(data):
    """
    Support common classes.json formats:
    - ["class1", "class2", ...]
    - {"classes": [...]}
    - {"class_to_idx": {"class1": 0, ...}}
    - {"0": "class1", "1": "class2", ...}
    """

    if isinstance(data, list):
        return data

    if isinstance(data, dict):

        if "classes" in data:
            return data["classes"]

        if "class_to_idx" in data:
            mapping = data["class_to_idx"]
            return [
                name for name, idx in
                sorted(mapping.items(), key=lambda x: x[1])
            ]

        if all(str(k).isdigit() for k in data.keys()):
            return [
                data[k] for k in
                sorted(data.keys(), key=lambda x: int(x))
            ]

    raise ValueError("Không nhận diện được định dạng classes.json")


CLASS_NAMES = get_class_names(classes_data)
NUM_CLASSES = len(CLASS_NAMES)

if NUM_CLASSES != 11:
    print(
        f"WARNING: Model hiện có {NUM_CLASSES} lớp, "
        "không phải 11 lớp như dự kiến."
    )

print("Classes:", CLASS_NAMES)


# =========================================================
# 3. MODEL CONFIGURATION
# =========================================================

MODEL_NAME = config.get("model_name", "efficientnet_b2")
IMG_SIZE = int(config.get("img_size", config.get("IMG", 256)))

MIN_CONF = float(
    config.get("min_conf", DEFAULT_MIN_CONF)
)

MIN_MARGIN = float(
    config.get("min_margin", DEFAULT_MIN_MARGIN)
)

MEAN = config.get(
    "mean",
    [0.485, 0.456, 0.406]
)

STD = config.get(
    "std",
    [0.229, 0.224, 0.225]
)

# If config.json specifies pretrained=False, this does not matter
# when loading a complete trained checkpoint.
PRETRAINED = False


# =========================================================
# 4. IMAGE PREPROCESSING
# =========================================================

def resize_with_padding(image, size):
    """
    Resize while preserving aspect ratio.
    Add padding instead of stretching the image.
    """

    image = image.convert("RGB")

    resampling = getattr(
        Image,
        "Resampling",
        Image
    ).BILINEAR

    image.thumbnail(
        (size, size),
        resampling
    )

    canvas = Image.new(
        "RGB",
        (size, size),
        PAD_COLOR
    )

    x = (size - image.width) // 2
    y = (size - image.height) // 2

    canvas.paste(image, (x, y))

    return canvas


transform = transforms.Compose([
    transforms.ToTensor(),

    transforms.Normalize(
        mean=MEAN,
        std=STD
    )
])


def preprocess_image(image_path):
    if not os.path.isfile(image_path):
        raise FileNotFoundError(
            f"Không tìm thấy ảnh: {image_path}"
        )

    image = Image.open(image_path)

    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    image = resize_with_padding(
        image,
        IMG_SIZE
    )

    tensor = transform(image)

    return tensor.unsqueeze(0)


# =========================================================
# 5. LOAD TRAINED MODEL
# =========================================================

def extract_state_dict(checkpoint):

    if isinstance(checkpoint, dict):

        possible_keys = [
            "model_state_dict",
            "state_dict",
            "model"
        ]

        for key in possible_keys:
            if key in checkpoint and isinstance(
                checkpoint[key], dict
            ):
                return checkpoint[key]

    return checkpoint


def load_model():

    if not os.path.isfile(MODEL_PATH):
        raise FileNotFoundError(
            f"Không tìm thấy model: {MODEL_PATH}"
        )

    print("Loading model...")

    model = timm.create_model(
        MODEL_NAME,
        pretrained=PRETRAINED,
        num_classes=NUM_CLASSES
    )

    try:
        checkpoint = torch.load(
            MODEL_PATH,
            map_location="cpu",
            weights_only=True
        )
    except TypeError:
        checkpoint = torch.load(
            MODEL_PATH,
            map_location="cpu"
        )

    state_dict = extract_state_dict(checkpoint)

    # Handle DataParallel checkpoints.
    state_dict = {
        k.replace("module.", "", 1): v
        for k, v in state_dict.items()
    }

    model.load_state_dict(
        state_dict,
        strict=True
    )

    model.to(DEVICE)
    model.eval()

    print("Model loaded successfully!")
    print("Model:", MODEL_NAME)
    print("Device:", DEVICE)
    print("Number of classes:", NUM_CLASSES)

    return model


model = load_model()


# =========================================================
# 6. PREDICTION
# =========================================================

@torch.inference_mode()
def predict(image_path):

    image_tensor = preprocess_image(
        image_path
    ).to(DEVICE)

    # Original image prediction.
    logits = model(image_tensor)

    # Softmax probabilities.
    probabilities = F.softmax(
        logits,
        dim=1
    )[0]

    # Get top 2 predictions.
    top_values, top_indices = torch.topk(
        probabilities,
        k=min(2, NUM_CLASSES)
    )

    best_conf = float(top_values[0].item())
    best_idx = int(top_indices[0].item())

    second_conf = (
        float(top_values[1].item())
        if NUM_CLASSES >= 2
        else 0.0
    )

    margin = best_conf - second_conf

    predicted_class = CLASS_NAMES[best_idx]

    # =====================================================
    # 7. CONFIDENCE-BASED REJECTION
    # =====================================================

    reasons = []

    if best_conf < MIN_CONF:
        reasons.append(
            f"Confidence thấp hơn {MIN_CONF:.2f}"
        )

    if margin < MIN_MARGIN:
        reasons.append(
            f"Khoảng cách giữa hai lớp thấp hơn "
            f"{MIN_MARGIN:.2f}"
        )

    accepted = len(reasons) == 0

    if accepted:
        status = "ACCEPTED"
        output_class = predicted_class
        message = "Dự đoán đủ độ tin cậy."
    else:
        status = "REJECTED"
        output_class = "Unknown / Uncertain"
        message = "Không đủ độ tin cậy để kết luận."

    # =====================================================
    # 8. RESULT
    # =====================================================

    result = {
        "image": os.path.basename(image_path),

        "status": status,

        "prediction": output_class,

        "raw_prediction": predicted_class,

        "confidence": round(best_conf, 4),

        "second_class": CLASS_NAMES[
            int(top_indices[1].item())
        ] if NUM_CLASSES >= 2 else None,

        "second_confidence": round(
            second_conf, 4
        ),

        "margin": round(margin, 4),

        "message": message,

        "rejection_reasons": reasons
    }

    return result


# =========================================================
# 9. DISPLAY RESULT
# =========================================================

def print_result(result):

    print("\n" + "=" * 55)
    print("              TOMATO AI CLASSIFIER")
    print("=" * 55)

    print("Image:", result["image"])

    print("Status:", result["status"])

    print("Prediction:", result["prediction"])

    print(
        "Raw prediction:",
        result["raw_prediction"]
    )

    print(
        "Confidence:",
        f'{result["confidence"] * 100:.2f}%'
    )

    print(
        "Second class:",
        result["second_class"]
    )

    print(
        "Second confidence:",
        f'{result["second_confidence"] * 100:.2f}%'
    )

    print(
        "Margin:",
        f'{result["margin"] * 100:.2f}%'
    )

    print("Message:", result["message"])

    if result["rejection_reasons"]:
        print("\nRejection reasons:")

        for reason in result["rejection_reasons"]:
            print("-", reason)

    print("=" * 55)


# =========================================================
# 10. SAVE RESULT
# =========================================================

def save_result(result, output_path):

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            result,
            f,
            ensure_ascii=False,
            indent=4
        )

    print("\nSaved result:", output_path)


# =========================================================
# 11. MAIN
# =========================================================

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description="Tomato disease classification"
    )

    parser.add_argument(
        "--image",
        type=str,
        required=True,
        help="Path to input image"
    )

    parser.add_argument(
        "--output",
        type=str,
        default="prediction_result.json",
        help="Output JSON file"
    )

    args = parser.parse_args()

    result = predict(args.image)

    print_result(result)

    save_result(
        result,
        args.output
    )
