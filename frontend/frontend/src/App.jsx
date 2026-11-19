import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function App() {
  const [sensors, setSensors] = useState({
    temperature: 0,
    humidity: 0,
    soil_adc: 0,
    soil_moisture: 0,
    light_lux: 0,
    status: 'Chưa có dữ liệu',
    alerts: [],
    recommendations: [],
    details: null,
  });
  const [chartData, setChartData] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lấy dữ liệu cảm biến định kỳ mỗi 3 giây và đẩy vào mảng dữ liệu biểu đồ
  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/sensors');
        const data = res.data;
        setSensors((prev) => ({
          ...prev,
          ...data,
          alerts: Array.isArray(data.alerts) ? data.alerts : [],
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        }));

        // Thêm mốc thời gian hiện tại để vẽ biểu đồ lịch sử
        const currentTime = new Date().toLocaleTimeString();
        setChartData((prevData) => {
          const newData = [...prevData, { time: currentTime, temp: data.temperature, hum: data.humidity }];
          // Giữ tối đa 15 điểm dữ liệu gần nhất cho biểu đồ gọn gàng
          if (newData.length > 15) newData.shift();
          return newData;
        });
      } catch (err) {
        console.error("Lỗi kết nối API cảm biến:", err);
      }
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 3000);
    return () => clearInterval(interval);
  }, []);

  // Xử lý khi chọn file ảnh
  const handleImageChange = (e) => {
    setSelectedImage(e.target.files[0]);
  };

  // Gửi ảnh lên Flask Backend để chạy AI chẩn đoán
  const handleUpload = async () => {
    if (!selectedImage) {
      alert("Vui lòng chọn một file ảnh lá cà chua trước!");
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedImage);

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPrediction(res.data);
    } catch (err) {
      console.error("Lỗi khi dự đoán ảnh:", err);
      alert("Có lỗi xảy ra khi phân tích ảnh qua AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="text-center mb-4 fw-bold text-success">Hệ thống SCADA Giám sát Vi khí hậu & AI Lá Cà Chua</h2>

      {/* Khung hiển thị thông số cảm biến Real-time */}
      <div className="row text-center mb-3">
        <div className="col-md-3 mb-3">
          <div className="p-3 bg-primary text-white rounded shadow-sm">
            <h5>Nhiệt độ</h5>
            <h3>{sensors.temperature} °C</h3>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="p-3 bg-success text-white rounded shadow-sm">
            <h5>Độ ẩm không khí</h5>
            <h3>{sensors.humidity} %</h3>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="p-3 bg-warning text-dark rounded shadow-sm">
            <h5>Độ ẩm đất</h5>
            <h3>{sensors.soil_moisture ?? 0} %</h3>
            <small className="d-block mt-1">ADC: {sensors.soil_adc ?? 0}</small>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="p-3 bg-info text-white rounded shadow-sm">
            <h5>Ánh sáng</h5>
            <h3>{sensors.light_lux} lux</h3>
          </div>
        </div>
      </div>

      {/* Khung Đánh giá & Khuyến nghị từ 4 giá trị Môi trường */}
      <div className="card p-4 shadow-sm mb-4">
        <h4 className="mb-3 text-secondary">🌿 Đánh giá & Khuyến nghị Môi trường</h4>
        <p className="mb-2">
          <strong>Trạng thái tổng hợp:</strong>{' '}
          <span className="fw-semibold">{sensors.status || 'Chưa có dữ liệu'}</span>
        </p>

        {sensors.alerts && sensors.alerts.length > 0 && (
          <div className="alert alert-warning py-2 px-3 mb-3">
            <strong>Cảnh báo:</strong>
            <ul className="mb-0 mt-1">
              {sensors.alerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-3 bg-light rounded border">
          <strong>Khuyến nghị cho người trồng:</strong>
          {sensors.recommendations && sensors.recommendations.length > 0 ? (
            <ul className="mb-0 mt-2">
              {sensors.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-0 mt-1 text-muted">Chưa có khuyến nghị hoặc đang chờ dữ liệu cảm biến.</p>
          )}
        </div>
      </div>

      {/* Khung Biểu đồ Lịch sử Real-time */}
      <div className="card p-4 shadow-sm mb-4">
        <h4 className="mb-3 text-secondary">📈 Biểu đồ Biến thiên Nhiệt độ & Độ ẩm (Real-time)</h4>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temp" name="Nhiệt độ (°C)" stroke="#0d6efd" strokeWidth={2} />
              <Line type="monotone" dataKey="hum" name="Độ ẩm (%)" stroke="#198754" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Khung Chẩn đoán AI */}
      <div className="card p-4 shadow-sm">
        <h4 className="mb-3 text-secondary">📷 Chẩn đoán Sâu bệnh Lá Cà Chua bằng AI</h4>
        <div className="mb-3">
          <input type="file" className="form-control" accept="image/*" onChange={handleImageChange} />
        </div>
        <button className="btn btn-dark w-100 py-2" onClick={handleUpload} disabled={loading}>
          {loading ? "Đang phân tích hình ảnh qua AI..." : "Tải lên và Chẩn đoán"}
        </button>

        {prediction && (
          <div className="mt-4 p-3 bg-light rounded border">
            <h5>Kết quả phân tích từ AI:</h5>
            <p><strong>Bệnh phát hiện:</strong> <span className="text-danger">{prediction.disease}</span></p>
            <p><strong>Độ tin cậy:</strong> {prediction.confidence}%</p>
            <p className="mb-0"><strong>Khuyến nghị:</strong> {prediction.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;