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
from PIL import Image, ImageOps
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

app = Flask(__name__)
CORS(app)

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

UPLOAD_FOLDER = BASE_DIR / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

# ===== CAU HINH AI MODEL (DUNG CHUAN INFER.PY) =====
AI_MODEL_DIR = PROJECT_ROOT / "leaf_ai_model"
MODEL_PATH = AI_MODEL_DIR / "model.onnx"
CONFIG_PATH = AI_MODEL_DIR / "config.json"
CLASSES_PATH = AI_MODEL_DIR / "classes.json"

ort_session = None
input_name = None
model_cfg = {"img_size": 256, "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225], "not_tomato_index": 10}
class_names = []

if CONFIG_PATH.exists():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        model_cfg.update(json.load(f))

if CLASSES_PATH.exists():
    with open(CLASSES_PATH, "r", encoding="utf-8") as f:
        class_names = json.load(f)

if MODEL_PATH.exists():
    ort_session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    input_name = ort_session.get_inputs()[0].name


def preprocess_for_onnx(image: Image.Image) -> np.ndarray:
    img = ImageOps.exif_transpose(image)
    if img.mode == "P" and "transparency" in img.info:
        img = img.convert("RGBA")
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        img = Image.alpha_composite(bg, rgba).convert("RGB")
    else:
        img = img.convert("RGB")

    img_size = int(model_cfg["img_size"])
    img = ImageOps.fit(img, (img_size, img_size), method=Image.Resampling.BILINEAR)

    x = np.asarray(img, dtype=np.float32) / 255.0
    mean = np.array(model_cfg["mean"], dtype=np.float32)
    std = np.array(model_cfg["std"], dtype=np.float32)
    x = (x - mean) / std
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    return x


# ===== LUONG THU THAP CAM BIEN ESP32 (CHAY NGAM) =====
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
            filename = data_dir / f"tomato_sensors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            with serial.Serial(serial_port, baud_rate, timeout=2) as ser:
                time.sleep(2)
                ser.reset_input_buffer()

                with open(filename, "w", newline="", encoding="utf-8") as file:
                    writer = csv.writer(file)
                    writer.writerow(["timestamp", "temperature_C", "humidity_percent", "soil_adc", "light_lux"])
                    file.flush()

                    last_saved = 0.0
                    while True:
                        line = ser.readline().decode("utf-8", errors="ignore").strip()
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

                        if not (-40 <= temperature <= 80 and 0 <= humidity <= 100 and 0 <= soil_adc <= 4095 and light_lux >= 0):
                            continue

                        now = time.monotonic()
                        if now - last_saved < sample_interval:
                            continue

                        timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
                        writer.writerow([timestamp, temperature, humidity, soil_adc, light_lux])
                        file.flush()
                        last_saved = now
        except Exception as e:
            print(f"[Serial {serial_port}]: {e} -> thu lai sau 5s")
            time.sleep(5)


if SERIAL_AVAILABLE:
    threading.Thread(target=background_sensor_collector, daemon=True).start()


def get_latest_csv_file():
    files = glob.glob(str(PROJECT_ROOT / "tomato_sensors_*.csv"))
    if not files:
        files = glob.glob(str(PROJECT_ROOT / "**" / "tomato_sensors_*.csv"), recursive=True)
    return max(files, key=os.path.getmtime) if files else None

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
    if df.empty or "humidity_percent" not in df.columns or "timestamp" not in df.columns:
        return False

    high_timestamps = []
    for idx in range(len(df) - 1, -1, -1):
        try:
            rh_val = float(df.iloc[idx]["humidity_percent"])
        except (TypeError, ValueError):
            break
        if rh_val >= threshold:
            high_timestamps.append(str(df.iloc[idx]["timestamp"]))
        else:
            break

    if len(high_timestamps) < 2:
        return False

    try:
        newest_dt = _parse_iso_safe(high_timestamps[0])
        oldest_dt = _parse_iso_safe(high_timestamps[-1])
        return (newest_dt - oldest_dt).total_seconds() >= min_seconds
    except ValueError:
        return False
@app.route("/api/sensors", methods=["GET"])
def get_sensor_data():
    try:
        latest_csv = get_latest_csv_file()
        if latest_csv and os.path.exists(latest_csv) and os.path.getsize(latest_csv) > 0:
            df = pd.read_csv(latest_csv)
            if not df.empty:
                latest = df.iloc[-1]
                temp = float(latest.get("temperature_C", 0.0))
                hum = float(latest.get("humidity_percent", 0.0))
                soil_adc = int(latest.get("soil_adc", 0))
                light = float(latest.get("light_lux", 0.0))
                ts_str = str(latest.get("timestamp", ""))

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
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict", methods=["POST"])
def predict_disease():
    if "image" not in request.files:
        return jsonify({"error": "Khong tim thay file anh trong request"}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "Chua chon file anh"}), 400

    try:
        image_bytes = file.read()
        if not image_bytes:
            return jsonify({"error": "File anh rong"}), 400

        if ort_session is None or not class_names:
            return jsonify({"error": "Thieu model.onnx, config.json hoac classes.json trong leaf_ai_model"}), 500

        with Image.open(BytesIO(image_bytes)) as img:
            x = preprocess_for_onnx(img)

        logits = ort_session.run(None, {input_name: x})[0][0]
        exp_vals = np.exp(logits - np.max(logits))
        probs = exp_vals / np.sum(exp_vals)

        order = probs.argsort()[::-1]
        top_idx = int(order[0])
        top_prob = float(probs[order[0]])
        second_prob = float(probs[order[1]]) if len(order) > 1 else 0.0
        not_idx = int(model_cfg.get("not_tomato_index", -1))

        if top_idx == not_idx:
            label = "Không phải lá cà chua"
        elif top_prob < 0.60 or (top_prob - second_prob) < 0.15:
            label = "Không chắc, cần chụp lại"
        else:
            label = class_names[top_idx]

        top3 = [
            {"label": class_names[int(i)], "confidence": round(float(probs[i]), 4)}
            for i in order[:3]
        ]
        disease_recommendations = {
            "Tomato_Bacterial_spot": "Cách ly/cắt bỏ lá bệnh nặng, tránh tưới phun lên lá, vệ sinh dụng cụ và theo dõi thêm các lá lân cận.",
            "Tomato_Early_blight": "Tỉa bỏ lá già/lá bệnh ở tầng dưới, giữ gốc thông thoáng, tưới gốc thay vì tưới lá và kiểm tra độ ẩm.",
            "Tomato_Late_blight": "Cần xử lý sớm vì lây nhanh khi ẩm mát: loại bỏ lá/cành nhiễm nặng, giảm ẩm tán lá và tăng thông gió.",
            "Tomato_Leaf_Mold": "Giảm độ ẩm không khí, tăng lưu thông gió/thông thoáng tán và tránh tưới làm ướt lá vào chiều tối.",
            "Tomato_Septoria_leaf_spot": "Cắt bỏ lá có đốm bệnh, dọn tàn dư lá rụng quanh gốc, tưới vào vùng rễ và giữ tán cây thông thoáng.",
            "Tomato_Spider_mites_Two_spotted_spider_mite": "Kiểm tra mặt dưới lá, duy trì độ ẩm/tưới hợp lý và theo dõi mật độ nhện đỏ để xử lý kịp thời.",
            "Tomato__Target_Spot": "Loại bỏ lá bị đốm nặng, cải thiện thông gió và tránh để tán lá ẩm ướt kéo dài.",
            "Tomato__Tomato_YellowLeaf__Curl_Virus": "Nhổ/cách ly cây nhiễm nặng nếu cần để hạn chế lây lan, kiểm soát côn trùng môi giới và vệ sinh vườn.",
            "Tomato__Tomato_mosaic_virus": "Vệ sinh tay/dụng cụ cắt tỉa, hạn chế tiếp xúc lây chéo và loại bỏ cây nhiễm bệnh nặng.",
            "Tomato_healthy": "Lá khỏe mạnh. Tiếp tục duy trì chế độ tưới nước, ánh sáng và thông gió ổn định.",
            "Không phải lá cà chua": "Ảnh không phải lá cà chua. Vui lòng chọn đúng ảnh lá cà chua để chẩn đoán.",
            "Không chắc, cần chụp lại": "Độ tin cậy chưa đủ cao. Vui lòng chụp lại ảnh rõ nét hơn, đủ sáng và lấy rõ bề mặt lá.",
        }

        recommendation = disease_recommendations.get(
            label,
            "Theo dõi thêm tình trạng lá, đảm bảo thông gió và tưới nước hợp lý."
        )

        return jsonify({
            "success": True,
            "prediction": label,
            "disease": label,
            "confidence": round(top_prob * 100, 2),
            "recommendation": recommendation,
            "top3": top3
        })
        return jsonify({
            "success": True,
            "prediction": label,
            "disease": label,
            "confidence": round(top_prob * 100, 2),
            "top3": top3
        })
    except Exception as e:
        import traceback
        print("LOI CHI TIET AI:\n", traceback.format_exc())
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)