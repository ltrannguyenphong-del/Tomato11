
import { useMemo, useState } from "react";
import {
  BellRing,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCheck,
  ThermometerSun,
  Droplets,
  Sprout,
  Sun,
  Clock3,
  CalendarDays,
  ShieldCheck,
  X,
} from "lucide-react";

import "../styles/alerts.css";

// Dữ liệu giả lập, chưa lấy từ ESP32 hoặc backend.
const sampleAlerts = [
  {
    id: 1,
    title: "Nhiệt độ vượt mức cảnh báo",
    detail: "Nhiệt độ đo được là 35,2°C.",
    advice:
      "Kiểm tra độ thông thoáng khu vực trồng và theo dõi nhiệt độ trong các lần đo tiếp theo.",
    level: "danger",
    sensor: "Nhiệt độ",
    value: "35,2°C",
    time: "09:15",
    icon: ThermometerSun,
  },
  {
    id: 2,
    title: "Độ ẩm không khí thấp",
    detail: "Độ ẩm không khí giảm xuống 43%.",
    advice:
      "Theo dõi độ ẩm không khí và cân nhắc điều chỉnh điều kiện tưới, thông gió phù hợp.",
    level: "warning",
    sensor: "Độ ẩm KK",
    value: "43%",
    time: "08:50",
    icon: Droplets,
  },
  {
    id: 3,
    title: "Đất có dấu hiệu thiếu ẩm",
    detail: "Giá trị độ ẩm đất ở mức thấp trong dữ liệu minh họa.",
    advice:
      "Kiểm tra trực tiếp đất và cảm biến trước khi quyết định tưới thêm.",
    level: "warning",
    sensor: "Độ ẩm đất",
    value: "27%",
    time: "08:25",
    icon: Sprout,
  },
  {
    id: 4,
    title: "Ánh sáng thấp vào ban ngày",
    detail: "Cường độ ánh sáng chỉ đạt 300 lux lúc 12:00.",
    advice:
      "Kiểm tra vật cản, vị trí trồng hoặc điều kiện thời tiết tại thời điểm đo.",
    level: "warning",
    sensor: "Ánh sáng",
    value: "300 lux",
    time: "07:45",
    icon: Sun,
  },
  {
    id: 5,
    title: "Hệ thống đang ở chế độ minh họa",
    detail: "Chưa có kết nối dữ liệu cảm biến thực tế.",
    advice:
      "Bạn vẫn có thể thử các tính năng của giao diện trong lúc chưa có ESP32.",
    level: "info",
    sensor: "Hệ thống",
    value: "Demo",
    time: "07:30",
    icon: Info,
  },
];

const levelConfig = {
  danger: { label: "Nguy hiểm", icon: AlertTriangle },
  warning: { label: "Cần chú ý", icon: AlertCircle },
  info: { label: "Thông tin", icon: Info },
};

function AlertRow({ alert, selected, read, onSelect }) {
  const Icon = alert.icon;
  const LevelIcon = levelConfig[alert.level].icon;

  return (
    <button
      type="button"
      className={[
        "garden-alert-item",
        `garden-alert-${alert.level}`,
        selected ? "selected" : "",
        read ? "is-read" : "",
      ].join(" ")}
      onClick={onSelect}
    >
      <div className="garden-alert-icon">
        <Icon size={21} />
      </div>

      <div className="garden-alert-item-content">
        <div className="garden-alert-item-top">
          <strong>{alert.title}</strong>
          {!read && <span className="garden-alert-unread-dot" />}
        </div>

        <p>{alert.detail}</p>

        <div className="garden-alert-item-meta">
          <span>
            <Clock3 size={12} />
            {alert.time}
          </span>
          <span>
            <LevelIcon size={12} />
            {levelConfig[alert.level].label}
          </span>
        </div>
      </div>
    </button>
  );
}

function Alerts() {
  const [filter, setFilter] = useState("all");
  const [readIds, setReadIds] = useState([]);
  const [selectedId, setSelectedId] = useState(1);

  const filteredAlerts = useMemo(() => {
    if (filter === "all") return sampleAlerts;
    if (filter === "unread") {
      return sampleAlerts.filter(
        (item) => !readIds.includes(item.id)
      );
    }
    return sampleAlerts.filter(
      (item) => item.level === filter
    );
  }, [filter, readIds]);

  const selectedAlert =
    sampleAlerts.find((item) => item.id === selectedId) || null;

  const unreadCount = sampleAlerts.filter(
    (item) => !readIds.includes(item.id)
  ).length;

  const dangerCount = sampleAlerts.filter(
    (item) => item.level === "danger"
  ).length;

  const warningCount = sampleAlerts.filter(
    (item) => item.level === "warning"
  ).length;

  const markAsRead = (id) => {
    setReadIds((current) =>
      current.includes(id) ? current : [...current, id]
    );
  };

  const markAllRead = () => {
    setReadIds(sampleAlerts.map((item) => item.id));
  };

  const selectAlert = (id) => {
    setSelectedId(id);
    markAsRead(id);
  };

  return (
    <div className="garden-alerts-page">
      <section className="garden-alerts-banner">
        <div className="garden-alerts-banner-content">
          <span className="garden-alerts-kicker">
            ✿ GARDEN CARE CENTER
          </span>

          <h2>Thông báo khu vườn</h2>

          <p>
            Những tín hiệu nhỏ giúp bạn chăm sóc
            cây cà chua tốt hơn mỗi ngày.
          </p>
        </div>

        <div className="garden-alerts-banner-art" aria-hidden="true">
          <span>🍅</span>
          <BellRing size={34} />
        </div>
      </section>

      <section className="garden-alerts-summary">
        <div className="garden-alert-summary-card all">
          <div className="garden-alert-summary-icon">
            <BellRing size={21} />
          </div>
          <div>
            <span>Tổng thông báo</span>
            <strong>{sampleAlerts.length}</strong>
          </div>
        </div>

        <div className="garden-alert-summary-card warning">
          <div className="garden-alert-summary-icon">
            <AlertCircle size={21} />
          </div>
          <div>
            <span>Cần chú ý</span>
            <strong>{warningCount}</strong>
          </div>
        </div>

        <div className="garden-alert-summary-card danger">
          <div className="garden-alert-summary-icon">
            <AlertTriangle size={21} />
          </div>
          <div>
            <span>Nguy hiểm</span>
            <strong>{dangerCount}</strong>
          </div>
        </div>

        <div className="garden-alert-summary-card unread">
          <div className="garden-alert-summary-icon">
            <CheckCheck size={21} />
          </div>
          <div>
            <span>Chưa đọc</span>
            <strong>{unreadCount}</strong>
          </div>
        </div>
      </section>

      <section className="garden-alerts-workspace">
        <div className="garden-alerts-list-panel">
          <div className="garden-alerts-panel-heading">
            <div>
              <h3>Danh sách cảnh báo</h3>
              <p>Dữ liệu mô phỏng để kiểm tra giao diện</p>
            </div>

            <button
              type="button"
              className="garden-alerts-read-all"
              onClick={markAllRead}
            >
              <CheckCheck size={16} />
              Đọc tất cả
            </button>
          </div>

          <div className="garden-alerts-filters">
            {[
              ["all", "Tất cả"],
              ["unread", "Chưa đọc"],
              ["danger", "Nguy hiểm"],
              ["warning", "Chú ý"],
              ["info", "Thông tin"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="garden-alerts-scroll">
            {filteredAlerts.length ? (
              filteredAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  selected={selectedId === alert.id}
                  read={readIds.includes(alert.id)}
                  onSelect={() => selectAlert(alert.id)}
                />
              ))
            ) : (
              <div className="garden-alerts-empty">
                <ShieldCheck size={35} />
                <strong>Không có thông báo nào</strong>
                <p>Danh sách của bạn đang trống.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="garden-alerts-detail-panel">
          <div className="garden-alerts-panel-heading">
            <div>
              <h3>Chi tiết cảnh báo</h3>
              <p>Thông tin và hướng xử lý</p>
            </div>

            <span className="garden-alerts-detail-sticker">🌱</span>
          </div>

          {selectedAlert ? (
            <div className="garden-alerts-detail-body">
              <span
                className={`garden-alerts-detail-level ${selectedAlert.level}`}
              >
                {levelConfig[selectedAlert.level].label}
              </span>

              <h4>{selectedAlert.title}</h4>

              <p className="garden-alerts-detail-description">
                {selectedAlert.detail}
              </p>

              <div className="garden-alerts-detail-info">
                <div>
                  <span>Thông số</span>
                  <strong>{selectedAlert.sensor}</strong>
                </div>
                <div>
                  <span>Giá trị minh họa</span>
                  <strong>{selectedAlert.value}</strong>
                </div>
                <div>
                  <span>Thời gian mẫu</span>
                  <strong>
                    <CalendarDays size={15} />
                    {selectedAlert.time}
                  </strong>
                </div>
              </div>

              <div className="garden-alerts-advice">
                <Sprout size={21} />
                <div>
                  <strong>Gợi ý chăm sóc</strong>
                  <p>{selectedAlert.advice}</p>
                </div>
              </div>

              <button
                type="button"
                className="garden-alerts-acknowledge"
                onClick={() => markAsRead(selectedAlert.id)}
                disabled={readIds.includes(selectedAlert.id)}
              >
                <CheckCheck size={17} />
                {readIds.includes(selectedAlert.id)
                  ? "Đã đánh dấu đã đọc"
                  : "Đánh dấu đã đọc"}
              </button>
            </div>
          ) : (
            <div className="garden-alerts-detail-empty">
              <X size={24} />
              Chọn một cảnh báo để xem.
            </div>
          )}
        </aside>
      </section>

      <div className="garden-alerts-demo-note">
        <Info size={15} />
        Đây là bản giao diện minh họa. Chưa có cảnh báo
        thời gian thực từ ESP32 hoặc backend.
      </div>
    </div>
  );
}

export default Alerts;
