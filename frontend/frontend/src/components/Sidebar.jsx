import { useState } from "react";
import {
  LayoutDashboard,
  Activity,
  ScanSearch,
  Bell,
  History,
  Sprout,
  ChevronRight,
  Leaf,
  PanelLeftClose,
  PanelLeftOpen,
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
];

function Sidebar({ activePage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={collapsed ? "app-sidebar sidebar-collapsed" : "app-sidebar"}
      style={{
        width: collapsed ? "78px" : undefined,
        minWidth: collapsed ? "78px" : undefined,
        maxWidth: collapsed ? "78px" : undefined,
        paddingLeft: collapsed ? "10px" : undefined,
        paddingRight: collapsed ? "10px" : undefined,
        transition: "width 0.22s ease, min-width 0.22s ease, padding 0.22s ease",
        overflowX: "hidden",
      }}
    >
      {/* Logo + nút thu gọn nguyên thanh sidebar */}
      <div
        className="sidebar-logo"
        style={{
          justifyContent: collapsed ? "center" : "space-between",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div className="logo-symbol" style={{ flexShrink: 0 }}>
            <span>🍅</span>
          </div>

          {!collapsed && (
            <div className="logo-words">
              <strong>Tomato</strong>
              <span>SmartCare</span>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Thu gọn thanh bên"
            title="Thu gọn thanh bên"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "9px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              color: "#475569",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {/* Nút mở lại thanh bên khi đang ở trạng thái thụt vào */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Mở rộng thanh bên"
          title="Mở rộng thanh bên"
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            marginBottom: "10px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          <PanelLeftOpen size={17} />
        </button>
      )}

      {!collapsed && (
        <div className="sidebar-section-label">MY LITTLE GARDEN</div>
      )}

      <nav className="sidebar-navigation">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const selected = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              className={
                selected ? "sidebar-link selected" : "sidebar-link"
              }
              onClick={() => onNavigate(item.id)}
              style={
                collapsed
                  ? {
                      justifyContent: "center",
                      paddingLeft: "0",
                      paddingRight: "0",
                    }
                  : undefined
              }
            >
              <Icon size={20} strokeWidth={2} style={{ flexShrink: 0 }} />

              {!collapsed && <span>{item.label}</span>}

              {!collapsed && selected && (
                <ChevronRight size={17} className="sidebar-chevron" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      {!collapsed && (
        <>
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
        </>
      )}
    </aside>
  );
}

export default Sidebar;