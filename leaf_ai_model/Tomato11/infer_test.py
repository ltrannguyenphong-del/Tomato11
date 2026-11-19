
import os
import csv
import json
import argparse
from pathlib import Path

import numpy as np
import onnxruntime as ort

from PIL import Image, ImageOps
from rembg import remove, new_session


# ============================================================
# 1. PATHS AND CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "model.onnx"
U2NET_PATH = BASE_DIR / "u2net.onnx"
CLASSES_PATH = BASE_DIR / "classes.json"
CONFIG_PATH = BASE_DIR / "config.json"

IMAGE_DIR = BASE_DIR / "anh_that"
OUTPUT_DIR = BASE_DIR / "test_output"

SUPPORTED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".bmp", ".webp"
}


# ============================================================
# 2. LOAD CONFIG
# ============================================================

def check_files():

    required_files = [
        MODEL_PATH,
        U2NET_PATH,
        CLASSES_PATH,
        CONFIG_PATH,
        IMAGE_DIR
    ]

    for path in required_files:
        if not path.exists():
            raise FileNotFoundError(
                f"Khong tim thay: {path}"
            )


def load_config():

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    return config


def load_classes():

    with open(CLASSES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    classes = data["classes"]

    if len(classes) != 11:
        raise ValueError(
            f"Can 11 classes, nhung nhan duoc {len(classes)}"
        )

    return classes


# ============================================================
# 3. INITIALIZE U2-NET
# ============================================================

def initialize_u2net():

    print("\n[INFO] Initializing U2-Net...")

    # Đảm bảo rembg sử dụng model U2-Net local
    os.environ["U2NET_HOME"] = str(BASE_DIR)

    session = new_session(
        "u2net",
        providers=["CPUExecutionProvider"]
    )

    print("[INFO] U2-Net READY")

    return session


# ============================================================
# 4. INITIALIZE EFFICIENTNET ONNX
# ============================================================

def initialize_classifier():

    print("[INFO] Initializing EfficientNet-B2...")

    session = ort.InferenceSession(
        str(MODEL_PATH),
        providers=["CPUExecutionProvider"]
    )

    input_info = session.get_inputs()[0]

    print("[INFO] EfficientNet READY")
    print("[INFO] Input:", input_info.name)
    print("[INFO] Shape:", input_info.shape)

    return session


# ============================================================
# 5. PREPROCESS IMAGE WITH U2-NET
# ============================================================

def preprocess_image(image_path, u2net_session, config):

    image = Image.open(image_path)
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    preprocessing = config["preprocessing"]

    img_size = int(config["img_size"])
    alpha_threshold = int(
        preprocessing["alpha_threshold"]
    )
    padding_ratio = float(
        preprocessing["padding_ratio"]
    )

    # Remove background
    result = remove(
        image,
        session=u2net_session,
        post_process_mask=True
    ).convert("RGBA")

    # Extract alpha mask
    alpha = np.array(result.getchannel("A"))

    mask = alpha > alpha_threshold

    if not np.any(mask):
        raise ValueError(
            "Khong tim thay foreground sau U2-Net"
        )

    # Find foreground bounding box
    ys, xs = np.where(mask)

    x_min = int(xs.min())
    x_max = int(xs.max()) + 1

    y_min = int(ys.min())
    y_max = int(ys.max()) + 1

    crop = result.crop(
        (x_min, y_min, x_max, y_max)
    )

    crop_w, crop_h = crop.size

    # Resize while preserving aspect ratio
    scale = min(
        img_size / (crop_w * (1 + 2 * padding_ratio)),
        img_size / (crop_h * (1 + 2 * padding_ratio))
    )

    new_w = max(1, round(crop_w * scale))
    new_h = max(1, round(crop_h * scale))

    crop = crop.resize(
        (new_w, new_h),
        Image.Resampling.LANCZOS
    )

    # White background canvas
    canvas = Image.new(
        "RGBA",
        (img_size, img_size),
        (255, 255, 255, 255)
    )

    paste_x = (img_size - new_w) // 2
    paste_y = (img_size - new_h) // 2

    canvas.alpha_composite(
        crop,
        (paste_x, paste_y)
    )

    final_image = canvas.convert("RGB")

    return final_image


# ============================================================
# 6. CLASSIFICATION
# ============================================================

def classify_image(image, model_session, config, classes):

    img_size = int(config["img_size"])

    normalization = config["normalization"]

    mean = np.array(
        normalization["mean"],
        dtype=np.float32
    ).reshape(1, 1, 3)

    std = np.array(
        normalization["std"],
        dtype=np.float32
    ).reshape(1, 1, 3)

    # RGB -> [0, 1]
    image_array = np.asarray(
        image.resize(
            (img_size, img_size),
            Image.Resampling.LANCZOS
        ),
        dtype=np.float32
    ) / 255.0

    # Normalize
    image_array = (image_array - mean) / std

    # HWC -> CHW -> NCHW
    input_tensor = np.transpose(
        image_array,
        (2, 0, 1)
    )

    input_tensor = np.expand_dims(
        input_tensor,
        axis=0
    ).astype(np.float32)

    input_name = model_session.get_inputs()[0].name

    outputs = model_session.run(
        None,
        {input_name: input_tensor}
    )

    logits = outputs[0][0]

    # Softmax
    logits = logits - np.max(logits)

    exp_values = np.exp(logits)

    probabilities = exp_values / np.sum(exp_values)

    if len(probabilities) != len(classes):
        raise ValueError("So luong output khong khop classes.json")

    top_indices = np.argsort(probabilities)[::-1][:3]

    results = []

    for idx in top_indices:

        results.append({
            "class": classes[int(idx)],
            "confidence": float(probabilities[idx])
        })

    return results


# ============================================================
# 7. GET ALL TEST IMAGES
# ============================================================

def get_images():

    images = []

    for path in IMAGE_DIR.rglob("*"):

        if (
            path.is_file()
            and path.suffix.lower() in SUPPORTED_EXTENSIONS
        ):
            images.append(path)

    return sorted(images)


# ============================================================
# 8. MAIN TEST
# ============================================================

def main():

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--image",
        type=str,
        default=None,
        help="Test mot anh rieng"
    )

    args = parser.parse_args()

    check_files()

    config = load_config()
    classes = load_classes()

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    print("\n========================================")
    print(" TOMATO DISEASE AI - INFERENCE TEST")
    print("========================================")

    print("[INFO] Classes:", len(classes))
    print("[INFO] Image size:", config["img_size"])

    # Initialize models once
    u2net_session = initialize_u2net()

    classifier_session = initialize_classifier()

    # Select images
    if args.image:

        image_path = Path(args.image)

        if not image_path.is_absolute():
            image_path = BASE_DIR / image_path

        if not image_path.exists():
            raise FileNotFoundError(image_path)

        image_paths = [image_path]

    else:
        image_paths = get_images()

    if not image_paths:
        print("[WARNING] Khong tim thay anh trong anh_that")
        return

    print("\n[INFO] Total images:", len(image_paths))

    csv_path = OUTPUT_DIR / "predictions.csv"

    csv_rows = []

    # Process images
    for index, image_path in enumerate(image_paths, start=1):

        print("\n----------------------------------------")
        print(f"[{index}/{len(image_paths)}] {image_path.name}")

        try:

            processed_image = preprocess_image(
                image_path,
                u2net_session,
                config
            )

            # Save processed image
            processed_path = (
                OUTPUT_DIR /
                f"{index:03d}_{image_path.stem}_processed.jpg"
            )

            processed_image.save(processed_path)

            # Predict
            results = classify_image(
                processed_image,
                classifier_session,
                config,
                classes
            )

            best = results[0]

            print("\nTOP 3 PREDICTIONS:")

            for rank, item in enumerate(results, start=1):

                print(
                    f"Top {rank}: {item['class']} "
                    f"| {item['confidence'] * 100:.2f}%"
                )

            csv_rows.append({
                "image": str(image_path),
                "predicted_class": best["class"],
                "confidence": best["confidence"],
                "top2": results[1]["class"],
                "top3": results[2]["class"],
                "status": "SUCCESS"
            })

        except Exception as error:

            print("[ERROR]", error)

            csv_rows.append({
                "image": str(image_path),
                "predicted_class": "",
                "confidence": "",
                "top2": "",
                "top3": "",
                "status": str(error)
            })

    # Export CSV
    with open(
        csv_path,
        "w",
        newline="",
        encoding="utf-8-sig"
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=[
                "image",
                "predicted_class",
                "confidence",
                "top2",
                "top3",
                "status"
            ]
        )

        writer.writeheader()
        writer.writerows(csv_rows)

    success_count = sum(
        row["status"] == "SUCCESS"
        for row in csv_rows
    )

    print("\n========================================")
    print(" INFERENCE TEST COMPLETED")
    print("========================================")
    print("Total images:", len(image_paths))
    print("Success:", success_count)
    print("Failed:", len(image_paths) - success_count)
    print("CSV:", csv_path)
    print("Processed images:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
