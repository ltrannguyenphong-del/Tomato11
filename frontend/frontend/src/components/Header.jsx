
import {
  Bell,
  CalendarDays,
  WifiOff,
  Search,
} from "lucide-react";

const pageTitles = {
  overview: {
    title: "Khu vườn của tôi 🍅",
    subtitle: "Một ngày tốt lành cùng những cây cà chua!",
  },
  monitoring: {
    title: "Giám sát IoT 🌱",
    subtitle: "Cùng theo dõi môi trường trong khu vườn nhé!",
  },
  diagnosis: {
    title: "Bác sĩ lá cà chua 🌿",
    subtitle: "AI sẽ giúp bạn kiểm tra sức khỏe của lá cây.",
  },
  alerts: {
    title: "Thông báo khu vườn 🔔",
    subtitle: "Những điều cần chú ý để cây luôn khỏe mạnh.",
  },
  history: {
    title: "Nhật ký khu vườn 📖",
    subtitle: "Lưu giữ hành trình chăm sóc cây cà chua.",
  },
  settings: {
    title: "Cài đặt hệ thống ⚙️",
    subtitle: "Tùy chỉnh Tomato SmartCare theo ý thích.",
  },
};

function Header({ activePage }) {
  const page = pageTitles[activePage] || pageTitles.overview;

  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <header className="app-header">
      <div className="header-title">
        <p className="header-eyebrow">
          TOMATO SMARTCARE ♡ MY LITTLE GARDEN
        </p>

        <h1>{page.title}</h1>

        <span>{page.subtitle}</span>
      </div>

      <div className="header-actions">
        <div className="header-date">
          <CalendarDays size={17} />
          <span>{today}</span>
        </div>

        <div className="header-icon" title="Tìm kiếm">
          <Search size={19} />
        </div>

        <div className="header-icon" title="Thông báo">
          <Bell size={19} />
        </div>

        <div className="header-avatar">
          🍅
        </div>
      </div>
    </header>
  );
}

export default Header;
