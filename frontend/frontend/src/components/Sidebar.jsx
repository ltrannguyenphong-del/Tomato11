
import {
  LayoutDashboard,
  Activity,
  ScanSearch,
  Bell,
  History,
  Settings,
  Sprout,
  ChevronRight,
  Leaf,
} from "lucide-react";

const menuItems = [
  {
    id: "overview",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    id: "monitoring",
    label: "Giám sát IoT",
    icon: Activity,
  },
  {
    id: "diagnosis",
    label: "Chẩn đoán AI",
    icon: ScanSearch,
  },
  {
    id: "alerts",
    label: "Cảnh báo",
    icon: Bell,
  },
  {
    id: "history",
    label: "Lịch sử",
    icon: History,
  },
  {
    id: "settings",
    label: "Cài đặt",
    icon: Settings,
  },
];

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <div className="logo-symbol">
          <span>🍅</span>
        </div>

        <div className="logo-words">
          <strong>Tomato</strong>
          <span>SmartCare</span>
        </div>
      </div>

      <div className="sidebar-section-label">
        MY LITTLE GARDEN
      </div>

      <nav className="sidebar-navigation">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const selected = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={
                selected
                  ? "sidebar-link selected"
                  : "sidebar-link"
              }
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={20} strokeWidth={2} />

              <span>{item.label}</span>

              {selected && (
                <ChevronRight
                  size={17}
                  className="sidebar-chevron"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-garden-card">
        <div className="garden-card-icon">
          <Sprout size={27} />
        </div>

        <strong>Grow with love ♡</strong>

        <p>
          Mỗi chiếc lá khỏe mạnh
          là một khu vườn hạnh phúc.
        </p>

        <div className="garden-decoration">
          <Leaf size={19} />
          <span>Smart Agriculture</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <span>Tomato SmartCare</span>
        <small>Version 1.0 · 2026</small>
      </div>
    </aside>
  );
}

export default Sidebar;
