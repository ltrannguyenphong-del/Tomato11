from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import glob
import os

app = Flask(__name__)
CORS(app)  # Cho phép React gọi API

# Thư mục chứa các file CSV dữ liệu (trỏ tới thư mục D:\dowload\Final year\AI\tomato)
DATA_DIR = r"D:\dowload\Final year\AI\tomato"

def get_latest_csv_file():
    """Hàm tự động tìm file CSV mới nhất được tạo bởi collect_data.py"""
    search_path = os.path.join(DATA_DIR, "tomato_sensors_*.csv")
    list_of_files = glob.glob(search_path)
    if not list_of_files:
        return None
    # Trả về file có thời gian sửa đổi gần nhất (mới nhất)
    latest_file = max(list_of_files, key=os.path.getmtime)
    return latest_file

@app.route('/api/sensors', methods=['GET'])
def get_sensor_data():
    """API đọc dòng dữ liệu cảm biến mới nhất từ file CSV thực tế"""
    try:
        latest_csv = get_latest_csv_file()
        
        if latest_csv and os.path.exists(latest_csv) and os.path.getsize(latest_csv) > 0:
            df = pd.read_csv(latest_csv)
            if not df.empty:
                # Lấy dòng cuối cùng (dữ liệu mới nhất từ ESP32)
                latest = df.iloc[-1]
                
                return jsonify({
                    "temperature": float(latest.get('temperature_C', 0.0)),
                    "humidity": float(latest.get('humidity_percent', 0.0)),
                    "soil_adc": int(latest.get('soil_adc', 0)),
                    "light_lux": float(latest.get('light_lux', 0.0)),
                    "status": "Normal"
                })
        
        # Nếu chưa có file dữ liệu nào
        return jsonify({
            "temperature": 0.0,
            "humidity": 0.0,
            "soil_adc": 0,
            "light_lux": 0.0,
            "status": "Waiting for hardware..."
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict_disease():
    """API chẩn đoán bệnh lá cà chua (Sẽ tích hợp model Kaggle sau)"""
    return jsonify({
        "disease": "Early Blight (Đốm vòng)",
        "confidence": 92.5,
        "recommendation": "Tăng thông thoáng tán cây, hạn chế tưới lá chiều tối."
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)