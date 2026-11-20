import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import "./App.css";
import Diagnosis from "./pages/Diagnosis";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import Settings from "./pages/Settings";
import "./styles/engineering-theme.css";
import {
  Thermometer,
  Droplets,
  Sprout,
  Sun,
  Heart,
  Bell,
  ScanSearch,
  Leaf,
} from "lucide-react";
import Monitoring from "./pages/Monitoring";

const pageNames = {
  overview: "Tổng quan",
  monitoring: "Giám sát IoT",
  diagnosis: "Chẩn đoán AI",
  alerts: "Cảnh báo",
  history: "Lịch sử",
  settings: "Cài đặt",
};

const sensorData = [
  {
    title: "Nhiệt độ",
    value: "28.4",
    unit: "°C",
    note: "Nhiệt độ ổn định",
    icon: Thermometer,
    className: "temp-card",
    emoji: "🌤️",
  },
  {
    title: "Độ ẩm KK",
    value: "76",
    unit: "%",
    note: "Không khí khá ẩm",
    icon: Droplets,
    className: "air-card",
    emoji: "💧",
  },
  {
    title: "Độ ẩm đất",
    value: "58",
    unit: "%",
    note: "Đất đủ ẩm cho cây",
    icon: Sprout,
    className: "soil-card",
    emoji: "🌱",
  },
  {
    title: "Ánh sáng",
    value: "12500",
    unit: "lux",
    note: "Ánh sáng tốt",
    icon: Sun,
    className: "light-card",
    emoji: "☀️",
  },
];

function CuteSensorCard({ item }) {
  const Icon = item.icon;

  return (
    <div className={`cute-sensor-card ${item.className}`}>
      <div className="cute-sensor-top">
        <div className="cute-icon-wrap">
          <Icon size={22} />
        </div>
        <span className="cute-emoji">{item.emoji}</span>
      </div>

      <p className="cute-card-title">{item.title}</p>

      <div className="cute-card-value">
        <strong>{item.value}</strong>
        <span>{item.unit}</span>
      </div>

      <p className="cute-card-note">{item.note}</p>
    </div>
  );
}

function OverviewPage() {
  return (
    <div className="cute-page">
      <section className="cute-hero">
        <div className="cute-hero-left">
          <span className="cute-badge">🍅 Tomato SmartCare</span>

          <h2>
            Khu vườn cà chua
            <br />
            theo phong cách pastel cute
          </h2>

          <p>
            Giao diện theo dõi cây cà chua thông minh, kết hợp IoT và AI,
            nhưng được thiết kế mềm mại, đáng yêu, dễ nhìn và gần gũi hơn.
          </p>

          <div className="cute-hero-tags">
            <span>Pastel UI</span>
            <span>Smart Garden</span>
            <span>Kawaii Tomato</span>
          </div>
        </div>

        <div className="cute-hero-right">
          <div className="tomato-cluster">
            <span className="tomato big">🍅</span>
            <span className="tomato small t1">🍅</span>
            <span className="tomato small t2">🍅</span>
            <span className="tomato small t3">🍅</span>
          </div>
        </div>
      </section>

      <section className="cute-section">
        <div className="cute-section-title">
          <h3>Thông số môi trường</h3>
          <p>Dữ liệu minh họa theo style dashboard dễ thương</p>
        </div>

        <div className="cute-sensor-grid">
          {sensorData.map((item) => (
            <CuteSensorCard key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="cute-bottom-grid">
        <div className="cute-panel recommendation-panel">
          <div className="panel-title-row">
            <div className="panel-icon pink">
              <Heart size={18} />
            </div>
            <div>
              <h4>Khuyến nghị cho cây</h4>
              <p>Gợi ý chăm sóc nhanh</p>
            </div>
          </div>

          <div className="note-list">
            <div className="note-card">
              <span>🌱</span>
              <div>
                <strong>Độ ẩm đất ổn</strong>
                <p>Chưa cần tưới thêm ngay lúc này.</p>
              </div>
            </div>

            <div className="note-card">
              <span>☀️</span>
              <div>
                <strong>Ánh sáng tốt</strong>
                <p>Vị trí hiện tại phù hợp cho cây phát triển.</p>
              </div>
            </div>

            <div className="note-card">
              <span>💧</span>
              <div>
                <strong>Theo dõi độ ẩm KK</strong>
                <p>Duy trì thông thoáng để tránh nấm bệnh.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="cute-panel status-panel">
          <div className="panel-title-row">
            <div className="panel-icon yellow">
              <Bell size={18} />
            </div>
            <div>
              <h4>Trạng thái hệ thống</h4>
              <p>Thông tin demo hiện tại</p>
            </div>
          </div>

          <div className="status-box-list">
            <div className="status-box">
              <span>Frontend</span>
              <strong className="ok">Đang chạy</strong>
            </div>

            <div className="status-box">
              <span>Backend Flask</span>
              <strong className="ok">Sẵn sàng</strong>
            </div>

            <div className="status-box">
              <span>ESP32 / cảm biến</span>
              <strong className="wait">Chưa kết nối</strong>
            </div>

            <div className="status-box">
              <span>AI nhận diện lá</span>
              <strong className="demo">Chế độ demo</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlaceholderPage({ title }) {
  const icons = {
    monitoring: <Droplets size={22} />,
    diagnosis: <ScanSearch size={22} />,
    alerts: <Bell size={22} />,
    history: <Leaf size={22} />,
    settings: <Heart size={22} />,
  };

  return (
    <div className="placeholder-cute-page">
      <div className="placeholder-sticker">{icons[title.toLowerCase()] || "🍅"}</div>

      <div className="placeholder-card">
        <div className="placeholder-emoji">🍅</div>
        <h2>{title}</h2>
        <p>
          Trang này mình sẽ làm tiếp theo với cùng concept pastel cute,
          nhưng mỗi trang sẽ có một màu và cảm giác riêng.
        </p>

        <div className="placeholder-tags">
          <span>cute</span>
          <span>pastel</span>
          <span>tomato theme</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("overview");

  return (
    <div className={`app-shell cute-theme page-${activePage}`}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="app-workspace">
        <Header activePage={activePage} />

        <main className="page-content">
       {activePage === "overview" ? (
  <OverviewPage />
) : activePage === "monitoring" ? (
  <Monitoring />
) : activePage === "diagnosis" ? (
  <Diagnosis />
) : activePage === "alerts" ? (
  <Alerts />
) : activePage === "history" ? (
  <History />
) : activePage === "settings" ? (
  <Settings />
) : (
  <PlaceholderPage title={pageNames[activePage]} />
)}
        </main>

        <footer className="workspace-footer">
          <span>© 2026 Tomato SmartCare</span>
          <span>Pastel Cute Dashboard for Smart Tomato Garden 🍅</span>
        </footer>
      </div>
    </div>
  );
}

export default App;