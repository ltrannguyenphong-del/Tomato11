
import csv
import random
import shutil
from pathlib import Path

# ======================================
# 1. CAU HINH
# ======================================

BASE_DIR = Path(__file__).resolve().parent

# THAY BANG DUONG DAN THAT CUA DATASET
SOURCE_DIR = Path(
    r"D:\Xampp\htdocs\Tomato11-main\Tomato Leaf Disease Dataset\Tomato Leaf Disease Dataset\TomatoDataset\TomatoDataset"
)

TEST_DIR = BASE_DIR / "test_images"
GROUND_TRUTH = BASE_DIR / "ground_truth.csv"

IMAGES_PER_CLASS = 20
SEED = 42

random.seed(SEED)

# ======================================
# 2. ANH XA TEN THU MUC SANG NHAN AI
# ======================================

CLASS_MAPPING = {
    "Tomato___Bacterial_spot": "Tomato_Bacterial_spot",
    "Tomato___Early_blight": "Tomato_Early_blight",
    "Tomato___Late_blight": "Tomato_Late_blight",
    "Tomato___Leaf_Mold": "Tomato_Leaf_Mold",
    "Tomato___Septoria_leaf_spot": "Tomato_Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite":
        "Tomato_Spider_mites_Two_spotted_spider_mite",
    "Tomato___Target_Spot": "Tomato__Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus":
        "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato___Tomato_mosaic_virus":
        "Tomato__Tomato_mosaic_virus",
    "Tomato___healthy": "Tomato_healthy"
}

EXTENSIONS = {".jpg", ".jpeg", ".png"}

# ======================================
# 3. KIEM TRA DATASET
# ======================================

if not SOURCE_DIR.is_dir():
    raise FileNotFoundError(
        f"Khong tim thay dataset: {SOURCE_DIR}"
    )

TEST_DIR.mkdir(exist_ok=True)

# Doc nhan cu de khong mat nhan anh that
existing_labels = {}

if GROUND_TRUTH.exists():
    with open(
        GROUND_TRUTH,
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as f:
        for row in csv.DictReader(f):
            name = (row.get("filename") or "").strip()
            label = (row.get("true_label") or "").strip()
            if name:
                existing_labels[name] = label

new_labels = {}
total_copied = 0

# ======================================
# 4. LAY ANH TU TUNG LOP
# ======================================

for folder_name, class_label in CLASS_MAPPING.items():

    source_folder = SOURCE_DIR / folder_name

    if not source_folder.is_dir():
        print(f"THIEU THU MUC: {folder_name}")
        continue

    images = [
        p for p in source_folder.rglob("*")
        if p.is_file()
        and p.suffix.lower() in EXTENSIONS
    ]

    images = sorted(images)
    random.shuffle(images)

    selected = images[:IMAGES_PER_CLASS]

    destination = TEST_DIR / "diseased"

    if class_label == "Tomato_healthy":
        destination = TEST_DIR / "healthy"

    destination.mkdir(parents=True, exist_ok=True)

    copied = 0

    for index, image in enumerate(selected, start=1):

        new_filename = (
            f"dataset_{class_label}_{index:04d}"
            f"{image.suffix.lower()}"
        )

        destination_path = destination / new_filename

        shutil.copy2(image, destination_path)

        new_labels[new_filename] = class_label

        copied += 1

    total_copied += copied

    print(
        f"{class_label}: "
        f"{copied}/{len(images)} anh"
    )

# ======================================
# 5. LUU GROUND TRUTH
# ======================================

existing_labels.update(new_labels)

with open(
    GROUND_TRUTH,
    "w",
    encoding="utf-8-sig",
    newline=""
) as f:

    writer = csv.writer(f)
    writer.writerow(["filename", "true_label"])

    for filename, label in sorted(existing_labels.items()):
        writer.writerow([filename, label])

print("\n========== HOAN THANH ==========")
print(f"Da sao chep: {total_copied} anh")
print(f"Da cap nhat: {GROUND_TRUTH}")
print("===============================")
