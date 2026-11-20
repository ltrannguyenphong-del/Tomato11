
import { useMemo, useState } from "react";
import {
  History as HistoryIcon,
  Search,
  Download,
  Activity,
  ScanSearch,
  Bell,
  CalendarDays,
  Database,
  Info,
} from "lucide-react";

import "../styles/history.css";

// Du lieu minh hoa - chua lay tu backend
const demoHistory = [
  {
    id: 1,
    date: "20/11/2026",
    time: "08:35",
    type: "sensor",
    title: "Đo dữ liệu môi trường",
    detail: "Nhiệt độ: 28.4°C | Độ ẩm: 76%",
    status: "Bình thường",
    statusType: "normal",
  },
  {
    id: 2,
    date: "20/11/2026",
    time: "08:20",
    type: "ai",
    title: "Nhận diện lá cà chua",
    detail: "Kết quả minh họa: Healthy",
    status: "Hoàn thành",
    statusType: "normal",
  },
  {
    id: 3,
    date: "20/11/2026",
    time: "08:05",
    type: "sensor",
    title: "Đo dữ liệu môi trường",
    detail: "Nhiệt độ: 27.8°C | Độ ẩm: 73%",
    status: "Bình thường",
    statusType: "normal",
  },
  {
    id: 4,
    date: "19/11/2026",
    time: "16:40",
    type: "alert",
    title: "Cảnh báo nhiệt độ",
    detail: "Nhiệt độ vượt ngưỡng thiết lập",
    status: "Cần chú ý",
    statusType: "warning",
  },
  {
    id: 5,
    date: "19/11/2026",
    time: "15:15",
    type: "ai",
    title: "Nhận diện bệnh lá",
    detail: "Kết quả minh họa: Late blight",
    status: "Hoàn thành",
    statusType: "normal",
  },
  {
    id: 6,
    date: "19/11/2026",
    time: "14:30",
    type: "sensor",
    title: "Đo dữ liệu môi trường",
    detail: "Nhiệt độ: 30.1°C | Độ ẩm: 68%",
    status: "Bình thường",
    statusType: "normal",
  },
  {
    id: 7,
    date: "18/11/2026",
    time: "11:20",
    type: "alert",
    title: "Cảnh báo độ ẩm đất",
    detail: "Độ ẩm đất thấp trong dữ liệu mẫu",
    status: "Cần chú ý",
    statusType: "warning",
  },
  {
    id: 8,
    date: "18/11/2026",
    time: "10:15",
    type: "sensor",
    title: "Đo dữ liệu môi trường",
    detail: "Nhiệt độ: 26.9°C | Độ ẩm: 72%",
    status: "Bình thường",
    statusType: "normal",
  },
];

const typeConfig = {
  sensor: {
    label: "Cảm biến",
    icon: Activity,
    className: "history-type-sensor",
  },
  ai: {
    label: "Chẩn đoán AI",
    icon: ScanSearch,
    className: "history-type-ai",
  },
  alert: {
    label: "Cảnh báo",
    icon: Bell,
    className: "history-type-alert",
  },
};

function downloadCSV(rows) {
  const headers = [
    "Ngày",
    "Giờ",
    "Loại",
    "Hoạt động",
    "Chi tiết",
    "Trạng thái",
  ];

  const content = [
    headers,
    ...rows.map((row) => [
      row.date,
      row.time,
      typeConfig[row.type].label,
      row.title,
      row.detail,
      row.status,
    ]),
  ]
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "tomato_history_demo.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function History() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");

    return demoHistory.filter((item) => {
      const matchesType =
        filter === "all" || item.type === filter;

      const searchableText = [
        item.title,
        item.detail,
        item.date,
        item.status,
        typeConfig[item.type].label,
      ]
        .join(" ")
        .toLocaleLowerCase("vi-VN");

      return (
        matchesType &&
        (!keyword || searchableText.includes(keyword))
      );
    });
  }, [filter, search]);

  const selected = demoHistory.find(
    (item) => item.id === selectedId
  );

  const sensorCount = demoHistory.filter(
    (item) => item.type === "sensor"
  ).length;

  const aiCount = demoHistory.filter(
    (item) => item.type === "ai"
  ).length;

  const alertCount = demoHistory.filter(
    (item) => item.type === "alert"
  ).length;

  return (
    <div className="history-page">
      <section className="history-heading">
        <div>
          <span className="history-eyebrow">
            TOMATO SMARTCARE / ACTIVITY LOG
          </span>

          <h2>Nhật ký khu vườn</h2>

          <p>
            Theo dõi lịch sử hoạt động và dữ liệu
            của hệ thống.
          </p>
        </div>

        <div className="history-heading-icon">
          <HistoryIcon size={29} />
        </div>
      </section>

      <section className="history-stats">
        {[
          {
            label: "Tổng hoạt động",
            value: demoHistory.length,
            icon: Database,
            theme: "total",
          },
          {
            label: "Lần đo cảm biến",
            value: sensorCount,
            icon: Activity,
            theme: "sensor",
          },
          {
            label: "Chẩn đoán AI",
            value: aiCount,
            icon: ScanSearch,
            theme: "ai",
          },
          {
            label: "Cảnh báo",
            value: alertCount,
            icon: Bell,
            theme: "alert",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className={`history-stat history-stat-${stat.theme}`}
            >
              <div className="history-stat-icon">
                <Icon size={21} />
              </div>

              <div>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            </div>
          );
        })}
      </section>

      <section className="history-panel">
        <div className="history-panel-top">
          <div>
            <h3>Lịch sử hoạt động</h3>
            <p>
              Tìm kiếm và lọc các bản ghi trong hệ thống
            </p>
          </div>

          <button
            type="button"
            className="history-export"
            onClick={() => downloadCSV(filteredRows)}
          >
            <Download size={17} />
            Xuất CSV
          </button>
        </div>

        <div className="history-toolbar">
          <div className="history-search">
            <Search size={17} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Tìm hoạt động, ngày, trạng thái..."
            />
          </div>

          <div className="history-filters">
            {[
              ["all", "Tất cả"],
              ["sensor", "Cảm biến"],
              ["ai", "AI"],
              ["alert", "Cảnh báo"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? "active" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="history-table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại</th>
                <th>Hoạt động</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((item) => {
                const config = typeConfig[item.type];
                const Icon = config.icon;

                return (
                  <tr
                    key={item.id}
                    className={
                      selectedId === item.id ? "selected" : ""
                    }
                    onClick={() =>
                      setSelectedId(
                        selectedId === item.id
                          ? null
                          : item.id
                      )
                    }
                  >
                    <td>
                      <div className="history-date">
                        <CalendarDays size={15} />
                        <div>
                          <strong>{item.date}</strong>
                          <small>{item.time}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`history-type ${config.className}`}
                      >
                        <Icon size={14} />
                        {config.label}
                      </span>
                    </td>

                    <td>
                      <div className="history-activity">
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`history-status ${item.statusType}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredRows.length === 0 && (
            <div className="history-empty">
              Không tìm thấy bản ghi phù hợp.
            </div>
          )}
        </div>

        <div className="history-panel-footer">
          <span>
            Hiển thị {filteredRows.length} / {demoHistory.length}
            {" "}bản ghi mẫu
          </span>

          <span>
            {selected
              ? `Đang chọn: ${selected.title}`
              : "Nhấn vào một dòng để chọn bản ghi"}
          </span>
        </div>
      </section>

      <div className="history-notice">
        <Info size={15} />
        Dữ liệu trong trang này chỉ dùng để thử giao diện.
        Chưa lấy từ cơ sở dữ liệu thực tế.
      </div>
    </div>
  );
}

export default History;
