
import csv
from pathlib import Path

import numpy as np
import pandas as pd

from infer import predict, classes, NOT

# =====================================
# 1. CAU HINH
# =====================================

BASE_DIR = Path(__file__).resolve().parent
TEST_DIR = BASE_DIR / "test_images"
GROUND_TRUTH = BASE_DIR / "ground_truth.csv"
OUTPUT_DIR = BASE_DIR / "threshold_results"

OUTPUT_DIR.mkdir(exist_ok=True)

CONF_VALUES = [0.50, 0.60, 0.70, 0.80]
MARGIN_VALUES = [0.10, 0.15, 0.20]

EXTENSIONS = {".jpg", ".jpeg", ".png"}

# =====================================
# 2. DOC NHAN THUC TE
# =====================================

ground_truth = {}

if GROUND_TRUTH.exists():
    with open(
        GROUND_TRUTH,
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

# =====================================
# 3. TINH XAC SUAT MOT LAN
# =====================================

images = sorted(
    p for p in TEST_DIR.rglob("*")
    if p.is_file() and p.suffix.lower() in EXTENSIONS
)

records = []

for path in images:
    try:
        probabilities = predict(path)
        order = np.argsort(probabilities)[::-1]

        top_idx = int(order[0])
        top_conf = float(probabilities[order[0]])
        second_conf = float(probabilities[order[1]])
        margin = top_conf - second_conf

        records.append({
            "filename": path.name,
            "true_label": ground_truth.get(path.name, ""),
            "top1_label": classes[top_idx],
            "top1_index": top_idx,
            "confidence": top_conf,
            "margin": margin
        })

        print(f"Da xu ly: {path.name}")

    except Exception as error:
        print(f"Loi anh {path.name}: {error}")

# =====================================
# 4. HAM QUYET DINH THEO NGUONG
# =====================================

def decide_threshold(row, min_conf, min_margin):

    # Giu nguyen logic infer.py hien tai
    if row["top1_index"] == NOT:
        return "Not_tomato"

    if (
        row["confidence"] < min_conf
        or row["margin"] < min_margin
    ):
        return "REJECT"

    return row["top1_label"]

# =====================================
# 5. THU 12 TO HOP NGUONG
# =====================================

summary = []
details = []

for min_conf in CONF_VALUES:
    for min_margin in MARGIN_VALUES:

        labeled_count = 0
        accepted_count = 0
        rejected_count = 0
        correct_count = 0

        for row in records:

            prediction = decide_threshold(
                row, min_conf, min_margin
            )

            true_label = row["true_label"]

            is_labeled = true_label in classes

            if is_labeled:
                labeled_count += 1

                if prediction == "REJECT":
                    rejected_count += 1
                else:
                    accepted_count += 1

                    if prediction == true_label:
                        correct_count += 1

            details.append({
                "filename": row["filename"],
                "true_label": true_label,
                "min_conf": min_conf,
                "min_margin": min_margin,
                "top1_label": row["top1_label"],
                "confidence": row["confidence"],
                "margin": row["margin"],
                "final_prediction": prediction,
                "status": (
                    "Chua co nhan"
                    if not is_labeled
                    else "Tu choi"
                    if prediction == "REJECT"
                    else "Dung"
                    if prediction == true_label
                    else "Sai"
                )
            })

        accuracy_all = (
            correct_count / labeled_count
            if labeled_count else np.nan
        )

        accuracy_accepted = (
            correct_count / accepted_count
            if accepted_count else np.nan
        )

        coverage = (
            accepted_count / labeled_count
            if labeled_count else np.nan
        )

        rejection_rate = (
            rejected_count / labeled_count
            if labeled_count else np.nan
        )

        summary.append({
            "min_conf": min_conf,
            "min_margin": min_margin,
            "labeled_images": labeled_count,
            "accepted_images": accepted_count,
            "rejected_images": rejected_count,
            "correct_images": correct_count,
            "accuracy_all": accuracy_all,
            "accuracy_accepted": accuracy_accepted,
            "coverage": coverage,
            "rejection_rate": rejection_rate
        })

# =====================================
# 6. XUAT KET QUA
# =====================================

summary_df = pd.DataFrame(summary)
details_df = pd.DataFrame(details)

summary_path = OUTPUT_DIR / "threshold_summary.csv"
details_path = OUTPUT_DIR / "threshold_details.csv"

summary_df.to_csv(
    summary_path,
    index=False,
    encoding="utf-8-sig"
)

details_df.to_csv(
    details_path,
    index=False,
    encoding="utf-8-sig"
)

print("\n========== AI-05 ==========")
print(f"Tong anh: {len(records)}")
print(f"So anh co nhan: {sum(r['true_label'] in classes for r in records)}")
print(f"So to hop nguong: {len(summary)}")
print("\nKet qua:")
print(summary_df.to_string(index=False))
print("\nDa luu:")
print(summary_path)
print(details_path)

if sum(r["true_label"] in classes for r in records) < 20:
    print(
        "\nCANH BAO: Du lieu co nhan qua it."
        " Chua du co so lua chon nguong toi uu."
    )

