
import csv
import glob
import json
import os
import threading
import time
from datetime import datetime
from io import BytesIO
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np
import onnxruntime as ort
import pandas as pd
from PIL import Image

from rembg import remove, new_session

from sensor_advisor import (
    build_combined_assessment,
    HIGH_HUMIDITY_THRESHOLD,
    HIGH_HUMIDITY_DURATION_SEC,
)

try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False


# ==========================================
# 1. FLASK CONFIGURATION
# ==========================================

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

UPLOAD_FOLDER = BASE_DIR / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


# ==========================================
# 2. AI MODEL CONFIGURATION - TOMATO11
# ==========================================

AI_MODEL_DIR = PROJECT_ROOT / "leaf_ai_model" / "Tomato11"

MODEL_PATH = AI_MODEL_DIR / "model.onnx"
U2NET_PATH = AI_MODEL_DIR / "u2net.onnx"
CONFIG_PATH = AI_MODEL_DIR / "config.json"
CLASSES_PATH = AI_MODEL_DIR / "classes.json"

ort_session = None
input_name = None
session_rembg = None
class_names = []

print("\n========== INITIALIZING AI MODEL ==========")
print("AI MODEL DIR:", AI_MODEL_DIR)

for path in [MODEL_PATH, U2NET_PATH, CONFIG_PATH, CLASSES_PATH]:
    if not path.exists():
        raise FileNotFoundError(f"Khong tim thay file: {path}")

# Load configuration
with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    model_cfg = json.load(f)

# Load classes
with open(CLASSES_PATH, "r", encoding="utf-8") as f:
    class_data = json.load(f)

class_names = class_data["classes"]

IMG_SIZE = int(model_cfg["img_size"])

MEAN = np.array(
    model_cfg["normalization"]["mean"],
    dtype=np.float32
)

STD = np.array(
    model_cfg["normalization"]["std"],
    dtype=np.float32
)

ALPHA_THRESHOLD = int(
    model_cfg["preprocessing"]["alpha_threshold"]
)

PADDING_RATIO = float(
    model_cfg["preprocessing"]["padding_ratio"]
)

# Validate configuration
if len(MEAN) != 3 or len(STD) != 3:
    raise ValueError("MEAN va STD phai co 3 gia tri")

if np.any(STD == 0):
    raise ValueError("STD khong duoc bang 0")

if not 0 <= PADDING_RATIO < 0.5:
    raise ValueError("PADDING_RATIO khong hop le")

if len(class_names) != model_cfg["num_classes"]:
    raise ValueError("So luong classes khong khop config")

expected_mapping = {
    name: i for i, name in enumerate(class_names)
}

if class_data["class_to_idx"] != expected_mapping:
    raise ValueError("Class mapping khong khop")

# Initialize U2-Net
print("Initializing U2-Net...")

session_rembg = new_session(
    "u2net",
    model_path=str(U2NET_PATH)
)

print("U2-Net READY")

# Initialize ONNX model
print("Initializing Tomato11 ONNX...")

ort_session = ort.InferenceSession(
    str(MODEL_PATH),
    providers=["CPUExecutionProvider"]
)

input_info = ort_session.get_inputs()[0]
input_name = input_info.name

output_shape = ort_session.get_outputs()[0].shape

if len(output_shape) >= 2:
    if isinstance(output_shape[-1], int):
        if output_shape[-1] != len(class_names):
            raise ValueError(
                f"Model output co {output_shape[-1]} classes, "
                f"nhung classes.json co {len(class_names)} classes"
            )

print("Tomato11 ONNX READY")
print("Input name:", input_name)
print("Classes:", len(class_names))
print("Image size:", IMG_SIZE)
print("===========================================\n")


# ==========================================
# 3. IMAGE PREPROCESSING
# MATCH infer_single.py
# ==========================================

def preprocess_for_onnx(image: Image.Image) -> np.ndarray:

    # Convert image to RGB
    image = image.convert("RGB")

    # Remove background using U2-Net
    result = remove(
        image,
        session=session_rembg,
        post_process_mask=True
    ).convert("RGBA")

    # Extract alpha mask
    alpha = np.array(result.getchannel("A"))
    mask = alpha > ALPHA_THRESHOLD

    if not mask.any():
        raise ValueError(
            "Khong tim thay vung doi tuong sau khi tach nen."
        )

    # Find object bounding box
    ys, xs = np.where(mask)

    x_min = int(xs.min())
    x_max = int(xs.max()) + 1

    y_min = int(ys.min())
    y_max = int(ys.max()) + 1

    # Crop leaf
    leaf = result.crop(
        (x_min, y_min, x_max, y_max)
    )

    w, h = leaf.size

    # Calculate padding
    pad = int(max(w, h) * PADDING_RATIO)

    new_w = w + 2 * pad
    new_h = h + 2 * pad

    # Calculate resize scale
    scale = min(
        (IMG_SIZE - 16) / new_w,
        (IMG_SIZE - 16) / new_h
    )

    resized_w = max(1, int(w * scale))
    resized_h = max(1, int(h * scale))

    # Resize leaf
    leaf = leaf.resize(
        (resized_w, resized_h),
        Image.Resampling.LANCZOS
    )

    # Create white background
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

    processed = canvas.convert("RGB")

    # Normalize
    arr = np.asarray(
        processed,
        dtype=np.float32
    ) / 255.0

    arr = (arr - MEAN) / STD

    # HWC -> CHW
    arr = np.transpose(arr, (2, 0, 1))

    # Add batch dimension
    arr = np.expand_dims(arr, axis=0).astype(np.float32)

    return arr


# ==========================================
# 4. SENSOR DATA COLLECTION
# ==========================================

# Tắt mặc định để chạy web/AI không cần ESP32.
# Khi cần dùng phần cứng, đổi thành True.
ENABLE_SERIAL = False


def background_sensor_collector():

    serial_port = "COM6"
    baud_rate = 115200
    sample_interval = 5

    data_dir = PROJECT_ROOT
    data_dir.mkdir(parents=True, exist_ok=True)

    if not SERIAL_AVAILABLE:
        print("-> Thieu pyserial, bo qua thu thap Serial.")
        return

    while True:
        try:
            filename = data_dir / (
                f"tomato_sensors_"
                f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            )

            with serial.Serial(
                serial_port,
                baud_rate,
                timeout=2
            ) as ser:

                time.sleep(2)
                ser.reset_input_buffer()

                with open(
                    filename,
                    "w",
                    newline="",
                    encoding="utf-8"
                ) as file:

                    writer = csv.writer(file)

                    writer.writerow([
                        "timestamp",
                        "temperature_C",
                        "humidity_percent",
                        "soil_adc",
                        "light_lux"
                    ])

                    file.flush()

                    last_saved = 0.0

                    while True:

                        line = ser.readline().decode(
                            "utf-8",
                            errors="ignore"
                        ).strip()

                        if not line.startswith("DATA,"):
                            continue

                        parts = line.split(",")

                        if len(parts) != 5:
                            continue

                        try:
                            temperature = float(parts[1])
                            humidity = float(parts[2])
                            soil_adc = int(parts[3])
                            light_lux = float(parts[4])

                        except ValueError:
                            continue

                        if not (
                            -40 <= temperature <= 80
                            and 0 <= humidity <= 100
                            and 0 <= soil_adc <= 4095
                            and light_lux >= 0
                        ):
                            continue

                        now = time.monotonic()

                        if now - last_saved < sample_interval:
                            continue

                        timestamp = datetime.now().astimezone().isoformat(
                            timespec="seconds"
                        )

                        writer.writerow([
                            timestamp,
                            temperature,
                            humidity,
                            soil_adc,
                            light_lux
                        ])

                        file.flush()
                        last_saved = now

        except Exception as e:
            print(
                f"[Serial {serial_port}]: {e} "
                "-> thu lai sau 5s"
            )

            time.sleep(5)


if ENABLE_SERIAL and SERIAL_AVAILABLE:
    threading.Thread(
        target=background_sensor_collector,
        daemon=True
    ).start()


# ==========================================
# 5. SENSOR DATA UTILITIES
# ==========================================

def get_latest_csv_file():

    files = glob.glob(
        str(PROJECT_ROOT / "tomato_sensors_*.csv")
    )

    if not files:
        files = glob.glob(
            str(PROJECT_ROOT / "**" / "tomato_sensors_*.csv"),
            recursive=True
        )

    return max(
        files,
        key=os.path.getmtime
    ) if files else None


def _parse_iso_safe(ts_str: str):

    dt = datetime.fromisoformat(ts_str)

    if dt.tzinfo is not None:
        return dt.astimezone().replace(tzinfo=None)

    return dt


def has_sustained_high_humidity(
    df: pd.DataFrame,
    threshold: float = HIGH_HUMIDITY_THRESHOLD,
    min_seconds: int = HIGH_HUMIDITY_DURATION_SEC,
) -> bool:

    if (
        df.empty
        or "humidity_percent" not in df.columns
        or "timestamp" not in df.columns
    ):
        return False

    high_timestamps = []

    for idx in range(len(df) - 1, -1, -1):

        try:
            rh_val = float(
                df.iloc[idx]["humidity_percent"]
            )

        except (TypeError, ValueError):
            break

        if rh_val >= threshold:
            high_timestamps.append(
                str(df.iloc[idx]["timestamp"])
            )
        else:
            break

    if len(high_timestamps) < 2:
        return False

    try:
        newest_dt = _parse_iso_safe(high_timestamps[0])
        oldest_dt = _parse_iso_safe(high_timestamps[-1])

        return (
            newest_dt - oldest_dt
        ).total_seconds() >= min_seconds

    except ValueError:
        return False


# ==========================================
# 6. API SENSOR
# ==========================================

@app.route("/api/sensors", methods=["GET"])
def get_sensor_data():

    try:
        latest_csv = get_latest_csv_file()

        if (
            latest_csv
            and os.path.exists(latest_csv)
            and os.path.getsize(latest_csv) > 0
        ):

            df = pd.read_csv(latest_csv)

            if not df.empty:

                latest = df.iloc[-1]

                temp = float(
                    latest.get("temperature_C", 0.0)
                )

                hum = float(
                    latest.get("humidity_percent", 0.0)
                )

                soil_adc = int(
                    latest.get("soil_adc", 0)
                )

                light = float(
                    latest.get("light_lux", 0.0)
                )

                ts_str = str(
                    latest.get("timestamp", "")
                )

                sustained_rh = has_sustained_high_humidity(df)

                assessment = build_combined_assessment(
                    temperature_c=temp,
                    humidity_rh=hum,
                    soil_adc=soil_adc,
                    light_lux=light,
                    timestamp_iso=ts_str,
                    sustained_high_rh_30m=sustained_rh,
                )

                return jsonify({
                    "temperature": temp,
                    "humidity": hum,
                    "soil_adc": soil_adc,
                    "soil_moisture": assessment["soil_moisture_percent"],
                    "light_lux": light,
                    "status": assessment["overall_status"],
                    "alerts": assessment["alerts"],
                    "recommendations": assessment["recommendations"],
                    "details": assessment["sensors"],
                })

        return jsonify({
            "temperature": 0.0,
            "humidity": 0.0,
            "soil_adc": 0,
            "soil_moisture": 0.0,
            "light_lux": 0.0,
            "status": "No Data",
            "alerts": [],
            "recommendations": [],
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ==========================================
# 7. API PREDICT DISEASE
# ==========================================

@app.route("/api/predict", methods=["POST"])
def predict_disease():

    if "image" not in request.files:
        return jsonify({
            "error": "Khong tim thay file anh trong request"
        }), 400

    file = request.files["image"]

    if not file.filename:
        return jsonify({
            "error": "Chua chon file anh"
        }), 400

    try:

        image_bytes = file.read()

        if not image_bytes:
            return jsonify({
                "error": "File anh rong"
            }), 400

        if (
            ort_session is None
            or session_rembg is None
            or not class_names
        ):
            return jsonify({
                "error": "AI model chua duoc khoi tao"
            }), 500

        # Load uploaded image
        with Image.open(BytesIO(image_bytes)) as img:
            x = preprocess_for_onnx(img)

        # ONNX inference
        logits = ort_session.run(
            None,
            {input_name: x}
        )[0][0]

        # Stable softmax, matching infer_single.py
        logits = np.asarray(
            logits,
            dtype=np.float64
        )

        if not np.all(np.isfinite(logits)):
            raise ValueError("Logits chua gia tri khong hop le")

        exp_vals = np.exp(
            logits - np.max(logits)
        )

        probs = exp_vals / np.sum(exp_vals)

        if len(probs) != len(class_names):
            raise ValueError(
                "So output model khong khop so class"
            )

        # Sort probabilities
        order = probs.argsort()[::-1]

        top_idx = int(order[0])
        top_prob = float(probs[top_idx])

        second_prob = (
            float(probs[order[1]])
            if len(order) > 1
            else 0.0
        )

        # Not tomato class
        not_tomato_index = class_names.index("Not_tomato")

        if top_idx == not_tomato_index:

            label = "Không phải lá cà chua"

        elif (
            top_prob < 0.60
            or (top_prob - second_prob) < 0.15
        ):

            label = "Không chắc, cần chụp lại"

        else:

            label = class_names[top_idx]

        # Top 3 predictions
        top3 = [
            {
                "label": class_names[int(i)],
                "confidence": round(float(probs[i]), 4)
            }
            for i in order[:3]
        ]

        # Disease recommendations
        disease_recommendations = {

            "Tomato_Bacterial_spot":
                "Cách ly/cắt bỏ lá bệnh nặng, tránh tưới phun lên lá, vệ sinh dụng cụ và theo dõi thêm các lá lân cận.",

            "Tomato_Early_blight":
                "Tỉa bỏ lá già/lá bệnh ở tầng dưới, giữ gốc thông thoáng, tưới gốc thay vì tưới lá và kiểm tra độ ẩm.",

            "Tomato_Late_blight":
                "Cần xử lý sớm vì lây nhanh khi ẩm mát: loại bỏ lá/cành nhiễm nặng, giảm ẩm tán lá và tăng thông gió.",

            "Tomato_Leaf_Mold":
                "Giảm độ ẩm không khí, tăng lưu thông gió/thông thoáng tán và tránh tưới làm ướt lá vào chiều tối.",

            "Tomato_Septoria_leaf_spot":
                "Cắt bỏ lá có đốm bệnh, dọn tàn dư lá rụng quanh gốc, tưới vào vùng rễ và giữ tán cây thông thoáng.",

            "Tomato_Spider_mites_Two_spotted_spider_mite":
                "Kiểm tra mặt dưới lá, duy trì độ ẩm/tưới hợp lý và theo dõi mật độ nhện đỏ để xử lý kịp thời.",

            "Tomato__Target_Spot":
                "Loại bỏ lá bị đốm nặng, cải thiện thông gió và tránh để tán lá ẩm ướt kéo dài.",

            "Tomato__Tomato_YellowLeaf__Curl_Virus":
                "Nhổ/cách ly cây nhiễm nặng nếu cần để hạn chế lây lan, kiểm soát côn trùng môi giới và vệ sinh vườn.",

            "Tomato__Tomato_mosaic_virus":
                "Vệ sinh tay/dụng cụ cắt tỉa, hạn chế tiếp xúc lây chéo và loại bỏ cây nhiễm bệnh nặng.",

            "Tomato_healthy":
                "Lá khỏe mạnh. Tiếp tục duy trì chế độ tưới nước, ánh sáng và thông gió ổn định.",

            "Không phải lá cà chua":
                "Ảnh không phải lá cà chua. Vui lòng chọn đúng ảnh lá cà chua để chẩn đoán.",

            "Không chắc, cần chụp lại":
                "Độ tin cậy chưa đủ cao. Vui lòng chụp lại ảnh rõ nét hơn, đủ sáng và lấy rõ bề mặt lá.",
        }

        recommendation = disease_recommendations.get(
            label,
            "Theo dõi thêm tình trạng lá, đảm bảo thông gió và tưới nước hợp lý."
        )

        print("\n========== PREDICTION ==========")
        print("Prediction:", label)
        print("Confidence:", round(top_prob * 100, 2), "%")
        print("Top 3:", top3)
        print("================================\n")

        return jsonify({
            "success": True,
            "prediction": label,
            "disease": label,
            "confidence": round(top_prob * 100, 2),
            "recommendation": recommendation,
            "top3": top3
        })

    except Exception as e:

        import traceback

        print(
            "LOI CHI TIET AI:\n",
            traceback.format_exc()
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ==========================================
# 8. RUN SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
        use_reloader=False
    )
