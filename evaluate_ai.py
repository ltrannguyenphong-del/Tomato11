
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay
)

from infer import classes

BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "ai_test_results.csv"
OUTPUT_DIR = BASE_DIR / "evaluation_results"
OUTPUT_DIR.mkdir(exist_ok=True)

# Doc ket qua AI-03
df = pd.read_csv(INPUT_FILE, encoding="utf-8-sig")

# Chuan hoa gia tri
df["true_label"] = df["true_label"].fillna("").astype(str)
df["predicted_label"] = df["predicted_label"].fillna("").astype(str)
df["top1_label"] = df["top1_label"].fillna("").astype(str)

# Chi giu anh co nhan hop le
labeled = df[df["true_label"].isin(classes)].copy()

print("========== AI-04 ==========")
print("Tong anh:", len(df))
print("Anh co nhan:", len(labeled))
print("Anh chua co nhan:", len(df) - len(labeled))

if labeled.empty:
    print("Chua co du lieu gan nhan de danh gia.")
    raise SystemExit(0)

# Chuan hoa ket qua Not_tomato
def normalize_prediction(value):
    if value == "Không phải lá cà chua":
        return "Not_tomato"
    if value == "Không chắc, cần chụp lại":
        return "REJECT"
    return value

labeled["prediction_normalized"] = (
    labeled["predicted_label"].apply(normalize_prediction)
)

# Ty le tu choi
rejected = labeled[
    labeled["prediction_normalized"] == "REJECT"
]

rejection_rate = len(rejected) / len(labeled)

# Accuracy tinh tren tat ca anh co nhan:
# REJECT duoc tinh la khong du doan dung
accuracy_all = (
    labeled["prediction_normalized"]
    == labeled["true_label"]
).mean()

# Danh gia rieng cac du doan duoc chap nhan
accepted = labeled[
    labeled["prediction_normalized"] != "REJECT"
].copy()

coverage = len(accepted) / len(labeled)

print(f"\nAccuracy (toan bo): {accuracy_all:.4f}")
print(f"Rejection rate: {rejection_rate:.4f}")
print(f"Coverage: {coverage:.4f}")

if accepted.empty:
    print("Khong co du doan nao duoc chap nhan.")
    raise SystemExit(0)

y_true = accepted["true_label"]
y_pred = accepted["prediction_normalized"]

accuracy = accuracy_score(y_true, y_pred)

precision, recall, f1, _ = (
    precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=classes,
        average="macro",
        zero_division=0
    )
)

print("\n===== KET QUA DU DOAN DUOC CHAP NHAN =====")
print(f"Accuracy: {accuracy:.4f}")
print(f"Precision Macro: {precision:.4f}")
print(f"Recall Macro: {recall:.4f}")
print(f"F1 Macro: {f1:.4f}")

# Luu bao cao chi tiet
report = classification_report(
    y_true,
    y_pred,
    labels=classes,
    target_names=classes,
    output_dict=True,
    zero_division=0
)

pd.DataFrame(report).transpose().to_csv(
    OUTPUT_DIR / "classification_report.csv",
    encoding="utf-8-sig"
)

# Confusion matrix
cm = confusion_matrix(
    y_true,
    y_pred,
    labels=classes
)

pd.DataFrame(
    cm,
    index=classes,
    columns=classes
).to_csv(
    OUTPUT_DIR / "confusion_matrix.csv",
    encoding="utf-8-sig"
)

fig, ax = plt.subplots(figsize=(13, 11))

disp = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=classes
)

disp.plot(
    ax=ax,
    xticks_rotation=90,
    cmap="Blues",
    values_format="d",
    colorbar=False
)

plt.title("Confusion Matrix - Tomato AI")
plt.tight_layout()

plt.savefig(
    OUTPUT_DIR / "confusion_matrix.png",
    dpi=200
)

plt.close()

# Luu tong hop
summary = pd.DataFrame([{
    "total_images": len(df),
    "labeled_images": len(labeled),
    "accepted_images": len(accepted),
    "rejected_images": len(rejected),
    "accuracy_all": accuracy_all,
    "accuracy_accepted": accuracy,
    "precision_macro": precision,
    "recall_macro": recall,
    "f1_macro": f1,
    "rejection_rate": rejection_rate,
    "coverage": coverage
}])

summary.to_csv(
    OUTPUT_DIR / "evaluation_summary.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\nDa luu ket qua vao:", OUTPUT_DIR)
print("====================================")

