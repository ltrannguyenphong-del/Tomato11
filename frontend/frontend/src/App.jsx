import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    soil_adc: 0,
    light_lux: 0,
    status: "Loading..."
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Tự động gọi API từ Flask Backend mỗi 3 giây để cập nhật dữ liệu cảm biến thời gian thực
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:5000/api/sensors');
        setSensorData(response.data);
      } catch (error) {
        console.error("Lỗi khi kết nối Flask API:", error);
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Giả lập gửi yêu cầu chẩn đoán bệnh lá cà chua
  const handleTestPrediction = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/api/predict', {});
      setPrediction(response.data);
    } catch (error) {
      console.error("Lỗi dự đoán bệnh:", error);
    }
    setLoading(false);
  };

  return (
    <div className="container my-4">
      {/* Tiêu đề Dashboard */}
      <div className="p-4 mb-4 bg-light rounded-3 shadow-sm border">
        <h1 className="text-success fw-bold">🍅 Tomato SCADA & AI Dashboard</h1>
        <p className="text-muted">Hệ thống giám sát vi khí hậu thời gian thực & chẩn đoán bệnh lá cà chua</p>
      </div>

      {/* Phần 1: Hiển thị thông số cảm biến */}
      <h3 className="mb-3">📊 Giám sát Môi trường (Real-time)</h3>
      <div className="row g-4 mb-5">
        <div className="col-md-3">
          <div className="card text-white bg-primary shadow">
            <div className="card-body">
              <h5 className="card-title">Nhiệt độ</h5>
              <h3>{sensorData.temperature} °C</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card text-white bg-success shadow">
            <div className="card-body">
              <h5 className="card-title">Độ ẩm không khí</h5>
              <h3>{sensorData.humidity} %</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card text-white bg-warning shadow">
            <div className="card-body">
              <h5 className="card-title">ADC Độ ẩm đất</h5>
              <h3>{sensorData.soil_adc}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card text-white bg-info shadow">
            <div className="card-body">
              <h5 className="card-title">Cường độ ánh sáng</h5>
              <h3>{sensorData.light_lux} lux</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Phần 2: Chẩn đoán bệnh qua ảnh lá */}
      <div className="card shadow-sm">
        <div className="card-header bg-dark text-white">
          <h4 className="mb-0">📸 Chẩn đoán Sâu bệnh Lá Cà Chua</h4>
        </div>
        <div className="card-body">
          <p>Tải lên hoặc chọn ảnh lá để hệ thống phân tích bằng mô hình AI:</p>
          <button 
            className="btn btn-outline-success mb-3" 
            onClick={handleTestPrediction}
            disabled={loading}
          >
            {loading ? "Đang phân tích..." : "Chạy thử nghiệm chẩn đoán"}
          </button>

          {prediction && (
            <div className="alert alert-secondary mt-3">
              <h5>Kết quả phân tích từ AI:</h5>
              <p><strong>Bệnh phát hiện:</strong> <span className="text-danger">{prediction.disease}</span></p>
              <p><strong>Độ tin cậy:</strong> {prediction.confidence}%</p>
              <p><strong>Khuyến nghị:</strong> {prediction.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;