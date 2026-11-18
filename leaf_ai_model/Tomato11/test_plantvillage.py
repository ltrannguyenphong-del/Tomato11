
import csv
import re
from pathlib import Path

from infer import predict_result, classes

# ==========================================
# CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent

# Thay bằng đường dẫn tập PlantVillage của bạn
DATASET_DIR = Path(r"D:\PlantVillage")

OUTPUT_FILE = BASE_DIR / "ai_test_results.csv"

EXTENSIONS = {".jpg", ".jpeg", ".png"}

# Chuẩn hóa tên thư mục
def normalize(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())

CLASS_MAP = {
    normalize(c): c
    for c in classes
    if c != "Not_tomato"
}

# ==========================================
# CHECK DATASET
# ==========================================

if not DATASET_DIR.exists():
    raise FileNotFoundError(DATASET_DIR)

folders = [p for p in DATASET_DIR.iterdir() if p.is_dir()]

if not folders:
    raise RuntimeError("Khong tim thay thu muc class!")

results = []

# ==========================================
# RUN TEST
# ==========================================

for folder in folders:

    folder_name = normalize(folder.name)

    # Xác định nhãn thực tế
    if folder_name in CLASS_MAP:
        true_label = CLASS_MAP[folder_name]

    elif folder_name.startswith("tomato"):
        raise ValueError(
            f"Khong nhan dien duoc class: {folder.name}"
        )

    else:
        true_label = "Not_tomato"

    images = [
        p for p in folder.rglob("*")
        if p.is_file()
        and p.suffix.lower() in EXTENSIONS
    ]

    print(f"\n{folder.name}: {len(images)} images")

    for image_path in images:

        try:
            result = predict_result(image_path)

            prediction = result["prediction"]
            confidence = result["confidence"]

            top3 = result["top3"]

            top1 = top3[0]["label"]
            top2 = top3[1]["label"]
            top3_label = top3[2]["label"]

            if prediction == "Khong phai la ca chua":
                prediction = "Không phải lá cà chua"

            if prediction == "Không phải lá cà chua":
                normalized_prediction = "Not_tomato"

            elif prediction == "Không chắc, cần chụp lại":
                normalized_prediction = "REJECT"

            else:
                normalized_prediction = prediction

            if normalized_prediction == "REJECT":
                status = "Tu choi du doan"
            elif normalized_prediction == true_label:
                status = "Dung"
            else:
                status = "Sai"

            results.append({
                "filename": str(image_path.relative_to(DATASET_DIR)),
                "true_label": true_label,
                "predicted_label": prediction,
                "top1_label": top1,
                "confidence": confidence,
                "top2": top2,
                "top3": top3_label,
                "status": status
            })

        except Exception as e:
            print(f"Loi {image_path}: {e}")

# ==========================================
# SAVE CSV
# ==========================================

fields = [
    "filename",
    "true_label",
    "predicted_label",
    "top1_label",
    "confidence",
    "top2",
    "top3",
    "status"
]

with open(
    OUTPUT_FILE,
    "w",
    newline="",
    encoding="utf-8-sig"
) as f:

    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(results)

print("\n========== TEST SUMMARY ==========")
print("Total images:", len(results))
print("Correct:", sum(r["status"] == "Dung" for r in results))
print("Incorrect:", sum(r["status"] == "Sai" for r in results))
print("Rejected:", sum(r["status"] == "Tu choi du doan" for r in results))
print("Saved:", OUTPUT_FILE)
