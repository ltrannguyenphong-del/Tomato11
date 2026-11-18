
import csv
from pathlib import Path

from infer import predict_result, classes

# ======================================
# 1. CAU HINH DUONG DAN
# ======================================

BASE_DIR = Path(__file__).resolve().parent

TEST_DIR = BASE_DIR / "test_images"
LABEL_FILE = BASE_DIR / "ground_truth.csv"
OUTPUT_FILE = BASE_DIR / "ai_test_results.csv"

EXTENSIONS = {".jpg", ".jpeg", ".png"}


# ======================================
# 2. DOC NHAN THUC TE
# ======================================

ground_truth = {}

if LABEL_FILE.exists():
    with open(
        LABEL_FILE,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:
        reader = csv.DictReader(f)

        for row in reader:
            filename = (row.get("filename") or "").strip()
            label = (row.get("true_label") or "").strip()

            if filename:
                ground_truth[filename] = label
else:
    print("Canh bao: Khong tim thay ground_truth.csv")


# ======================================
# 3. TIM TAT CA ANH KIEM THU
# ======================================

images = sorted(
    p for p in TEST_DIR.rglob("*")
    if p.is_file()
    and p.suffix.lower() in EXTENSIONS
)

results = []

if not images:
    print("Chua co anh trong test_images!")


# ======================================
# 4. CHAY MO HINH VA DOI CHIEU
# ======================================

for image_path in images:

    true_label = ground_truth.get(
        image_path.name, ""
    )

    try:
        result = predict_result(image_path)

        prediction = result["prediction"]
        confidence = result["confidence"]

        top1 = result["top3"][0]["label"]
        top2 = result["top3"][1]["label"]
        top3 = result["top3"][2]["label"]

        # Xac dinh trang thai
        if not true_label:
            status = "Chua co nhan"

        elif true_label not in classes:
            status = "Nhan khong hop le"

        elif prediction == "Không chắc, cần chụp lại":
            status = "Tu choi du doan"

        elif prediction == "Không phải lá cà chua":
            status = (
                "Dung"
                if true_label == "Not_tomato"
                else "Sai"
            )

        else:
            status = (
                "Dung"
                if prediction == true_label
                else "Sai"
            )

        # Luu ket qua
        results.append({
            "filename": image_path.name,
            "true_label": true_label,
            "predicted_label": prediction,
            "top1_label": top1,
            "confidence": confidence,
            "top2": top2,
            "top3": top3,
            "status": status
        })

        print(
            f"{image_path.name:25s} -> "
            f"{prediction:35s} | "
            f"{confidence:.2%} | "
            f"{status}"
        )

    except Exception as error:
        print(
            f"Loi xu ly {image_path.name}: {error}"
        )


# ======================================
# 5. XUAT BANG KET QUA CSV
# ======================================

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
    encoding="utf-8-sig",
    newline=""
) as f:

    writer = csv.DictWriter(
        f,
        fieldnames=fields
    )

    writer.writeheader()
    writer.writerows(results)


# ======================================
# 6. THONG KE KET QUA
# ======================================

total = len(results)

correct = sum(
    r["status"] == "Dung"
    for r in results
)

incorrect = sum(
    r["status"] == "Sai"
    for r in results
)

rejected = sum(
    r["status"] == "Tu choi du doan"
    for r in results
)

unlabeled = sum(
    r["status"] == "Chua co nhan"
    for r in results
)

print("\n========== TONG KET AI-03 ==========")
print(f"Tong anh xu ly: {total}")
print(f"Du doan dung: {correct}")
print(f"Du doan sai: {incorrect}")
print(f"Tu choi du doan: {rejected}")
print(f"Chua co nhan: {unlabeled}")
print(f"File ket qua: {OUTPUT_FILE}")
print("====================================")
