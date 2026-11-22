import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Thermometer,
  Droplets,
  Sprout,
  Sun,
  Play,
  Pause,
  RefreshCw,
  Info,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Calendar,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import "../styles/monitoring.css";

const API_BASE_URL = "http://127.0.0.1:5000";
const MAX_POINTS_PER_DAY = 288;
const DAILY_STORAGE_KEY = "tomato_smartcare_daily_history_v1";
const LEGACY_STORAGE_KEY = "tomato_smartcare_monitoring_history_v1";

function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeLabel(date = new Date(), includeSeconds = true) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" } : {}),
  });
}

function formatValue(value, digits = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function loadDailyStore() {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const validStore = store && typeof store === "object" ? { ...store } : {};

    // Di chuyển dữ liệu cũ nếu có
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyArr = JSON.parse(legacyRaw);
      if (Array.isArray(legacyArr) && legacyArr.length > 0) {
        const todayKey = toDateKey(new Date());
        const existingToday = Array.isArray(validStore[todayKey])
          ? validStore[todayKey]
          : [];
        if (existingToday.length === 0) {
          validStore[todayKey] = legacyArr
            .map((pt) => ({ ...pt, dateKey: pt.dateKey || todayKey }))
            .slice(-MAX_POINTS_PER_DAY);
        }
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    return validStore;
  } catch {
    return {};
  }
}

function saveDailyStore(store) {
  try {
    // Giữ tối đa 30 ngày gần nhất để tránh đầy localStorage
    const sortedKeys = Object.keys(store).sort();
    const keptKeys = sortedKeys.slice(-30);
    const trimmed = {};
    for (const k of keptKeys) {
      trimmed[k] = Array.isArray(store[k])
        ? store[k].slice(-MAX_POINTS_PER_DAY)
        : [];
    }
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Bỏ qua nếu đầy bộ nhớ trình duyệt
  }
}

const sensorConfig = [
  {
    key: "temperature",
    title: "Nhiệt độ",
    unit: "°C",
    icon: Thermometer,
    theme: "mon-temperature",
    digits: 1,
  },
  {
    key: "humidity",
    title: "Độ ẩm không khí",
    unit: "%",
    icon: Droplets,
    theme: "mon-humidity",
    digits: 0,
  },
  {
    key: "soil",
    title: "Độ ẩm đất",
    unit: "%",
    icon: Sprout,
    theme: "mon-soil",
    digits: 1,
  },
  {
    key: "light",
    title: "Ánh sáng",
    unit: "lux",
    icon: Sun,
    theme: "mon-light",
    digits: 0,
  },
];

// Ban ngày: 06:00 - 17:59 | Ban đêm / Tối: 18:00 - 05:59
function isDaytimeNow(now = new Date()) {
  const hour = now.getHours();
  return hour >= 6 && hour < 18;
}

function evaluateTemperature(temp) {
  if (typeof temp !== "number" || !Number.isFinite(temp)) {
    return {
      level: "unknown",
      status: "Chưa có dữ liệu",
      advice: "Đang chờ dữ liệu nhiệt độ từ cảm biến.",
    };
  }
  if (temp < 15) {
    return {
      level: "danger",
      status: "Cảnh báo lạnh",
      advice:
        "Theo dõi tốc độ sinh trưởng; che chắn hoặc giữ ấm nếu có thể, tránh gió lạnh và hạn chế tưới quá mức khi đất lâu khô.",
    };
  }
  if (temp < 20) {
    return {
      level: "monitor",
      status: "Theo dõi",
      advice: "Hạn chế để cây tiếp xúc với gió lạnh kéo dài và theo dõi sinh trưởng.",
    };
  }
  if (temp <= 30) {
    return {
      level: "good",
      status: "Tốt",
      advice: "Điều kiện nhiệt độ phù hợp; duy trì thông thoáng và chế độ tưới phù hợp.",
    };
  }
  if (temp <= 34) {
    return {
      level: "monitor",
      status: "Cảnh báo nhiệt",
      advice:
        "Tăng thông gió, giảm nhiệt trực tiếp lên tán cây và kiểm tra độ ẩm đất trước khi tưới.",
    };
  }
  if (temp < 38) {
    return {
      level: "warn",
      status: "Nguy cơ cao",
      advice: "Che lưới giảm nắng phù hợp, kiểm tra độ ẩm đất và tình trạng héo.",
    };
  }
  return {
    level: "danger",
    status: "Nguy hiểm",
    advice:
      "Can thiệp làm mát ngay, kiểm tra cây thường xuyên và kiểm tra độ ẩm đất trước khi tưới.",
  };
}

function evaluateHumidity(rh) {
  if (typeof rh !== "number" || !Number.isFinite(rh)) {
    return {
      level: "unknown",
      status: "Chưa có dữ liệu",
      advice: "Đang chờ dữ liệu độ ẩm không khí từ cảm biến.",
    };
  }
  if (rh < 40) {
    return {
      level: "warn",
      status: "Khô đáng kể",
      advice:
        "Kiểm tra cây có héo không; xem xét giảm stress do khô nóng và tăng ẩm hợp lý.",
    };
  }
  if (rh < 55) {
    return {
      level: "monitor",
      status: "Cần theo dõi",
      advice: "Theo dõi tình trạng lá và nhu cầu nước của cây.",
    };
  }
  if (rh <= 75) {
    return {
      level: "good",
      status: "Tốt",
      advice:
        "Độ ẩm không khí phù hợp; tiếp tục duy trì thông gió và chế độ tưới hiện tại.",
    };
  }
  if (rh <= 85) {
    return {
      level: "monitor",
      status: "Cảnh báo",
      advice:
        "Độ ẩm không khí cao; tăng lưu thông không khí và tránh tưới lên lá vào chiều tối.",
    };
  }
  if (rh <= 90) {
    return {
      level: "warn",
      status: "Nguy cơ cao",
      advice:
        "Thông gió, giảm thời gian lá ướt và kiểm tra dấu hiệu bệnh trên lá.",
    };
  }
  return {
    level: "danger",
    status: "Nguy hiểm",
    advice:
      "Ưu tiên giảm ẩm, tăng thông gió, kiểm tra mặt dưới lá và kết hợp quan sát / chẩn đoán AI.",
  };
}

function evaluateSoilMoisture(soil) {
  if (typeof soil !== "number" || !Number.isFinite(soil)) {
    return {
      level: "unknown",
      status: "Chưa có dữ liệu",
      advice: "Đang chờ dữ liệu độ ẩm đất đã hiệu chuẩn.",
    };
  }
  if (soil < 15) {
    return {
      level: "danger",
      status: "Rất khô",
      advice: "Kiểm tra đất tại vùng rễ và tưới từ từ nếu xác nhận thiếu nước.",
    };
  }
  if (soil < 25) {
    return {
      level: "warn",
      status: "Thiếu ẩm",
      advice: "Tưới bổ sung từ từ, sau đó đo lại độ ẩm đất.",
    };
  }
  if (soil < 40) {
    return {
      level: "monitor",
      status: "Cần theo dõi",
      advice: "Kiểm tra độ khô ở vùng rễ; chuẩn bị tưới khi cần.",
    };
  }
  if (soil <= 70) {
    return {
      level: "good",
      status: "Mục tiêu vận hành",
      advice: "Duy trì chế độ hiện tại; không tưới thêm nếu đất vẫn đủ ẩm.",
    };
  }
  if (soil <= 80) {
    return {
      level: "monitor",
      status: "Ẩm cao",
      advice: "Theo dõi khả năng thoát nước, tạm hoãn tưới nếu đất đang ướt.",
    };
  }
  if (soil <= 90) {
    return {
      level: "warn",
      status: "Nguy cơ úng",
      advice:
        "Kiểm tra đất có bão hòa nước hay không, cải thiện thoát nước và tạm hoãn tưới.",
    };
  }
  return {
    level: "danger",
    status: "Rất ẩm",
    advice: "Kiểm tra nguy cơ úng và tình trạng vùng rễ ngay; tạm hoãn tưới.",
  };
}

function evaluateLight(lux, temp, soil, now = new Date()) {
  if (typeof lux !== "number" || !Number.isFinite(lux)) {
    return {
      level: "unknown",
      status: "Chưa có dữ liệu",
      advice: "Đang chờ dữ liệu cường độ ánh sáng.",
    };
  }

  const daytime = isDaytimeNow(now);

  if (!daytime) {
    if (lux < 5000) {
      return {
        level: "good",
        status: "Bình thường (ban đêm)",
        advice:
          "Ban đêm ánh sáng thấp là bình thường; không phát cảnh báo thiếu sáng.",
      };
    }
    if (lux <= 30000) {
      return {
        level: "good",
        status: "Bình thường (ban đêm)",
        advice: "Ánh sáng ban đêm nằm trong ngưỡng theo dõi bình thường.",
      };
    }
    return {
      level: "monitor",
      status: "Ánh sáng mạnh ban đêm",
      advice: "Kiểm tra nguồn chiếu sáng bổ sung hoặc đèn gần vườn vào ban đêm.",
    };
  }

  if (lux < 1000) {
    return {
      level: "danger",
      status: "Thiếu sáng nghiêm trọng",
      advice:
        "Thiếu sáng ban ngày (< 1.000 lux): kiểm tra mái che, vị trí cây và vật cản ánh sáng.",
    };
  }
  if (lux < 5000) {
    return {
      level: "warn",
      status: "Ánh sáng thấp",
      advice:
        "Cảnh báo thiếu sáng ban ngày (< 5.000 lux): kiểm tra cây có bị che bóng hay không.",
    };
  }
  if (lux < 10000) {
    return {
      level: "monitor",
      status: "Cần theo dõi",
      advice:
        "Ánh sáng ban ngày hơi yếu (5.000–10.000 lux): đánh giá thời gian chiếu sáng và thời tiết.",
    };
  }
  if (lux <= 30000) {
    return {
      level: "good",
      status: "Mức tham khảo tốt",
      advice: "Duy trì điều kiện hiện tại nếu cây phát triển bình thường.",
    };
  }
  if (lux <= 50000) {
    return {
      level: "monitor",
      status: "Ánh sáng mạnh",
      advice: "Theo dõi nhiệt độ, độ ẩm đất và biểu hiện héo.",
    };
  }

  const isHotOrDry =
    (typeof temp === "number" && Number.isFinite(temp) && temp >= 34) ||
    (typeof soil === "number" && Number.isFinite(soil) && soil < 25);

  if (isHotOrDry) {
    return {
      level: "danger",
      status: "Ánh sáng mạnh · Nguy cơ stress",
      advice:
        "Nguy cơ stress nhiệt và thiếu nước: kiểm tra độ ẩm đất, tưới nếu cần và giảm nắng trực tiếp phù hợp.",
    };
  }

  return {
    level: "monitor",
    status: "Ánh sáng mạnh",
    advice:
      "Ánh sáng mạnh, tiếp tục theo dõi nhiệt độ, độ ẩm đất và biểu hiện của cây.",
  };
}

function buildCombinedCareRecommendations({ temp, rh, soil, lux, hasData, now }) {
  if (!hasData) {
    return [
      {
        tag: "Chưa có dữ liệu đo",
        tone: "monitor",
        text: "Không có mẫu đo nào cho ngày được chọn để đưa ra khuyến nghị chăm sóc.",
      },
    ];
  }

  const tEval = evaluateTemperature(temp);
  const hEval = evaluateHumidity(rh);
  const sEval = evaluateSoilMoisture(soil);
  const lEval = evaluateLight(lux, temp, soil, now);

  const items = [];

  if (
    typeof temp === "number" &&
    Number.isFinite(temp) &&
    temp > 30 &&
    typeof soil === "number" &&
    Number.isFinite(soil) &&
    soil < 40
  ) {
    items.push({
      tag: "Ưu tiên cao · Nóng & đất khô",
      tone: "danger",
      text: "Kiểm tra đất tại vùng rễ và tưới từ từ nếu đất thực sự thiếu ẩm; tăng thông gió hoặc che nắng phù hợp để giảm stress nhiệt.",
    });
  }

  if (typeof rh === "number" && Number.isFinite(rh) && rh > 85) {
    items.push({
      tag:
        rh > 90
          ? "Ưu tiên cao · Ẩm không khí > 90%"
          : "Cảnh báo · Ẩm không khí cao",
      tone: rh > 90 ? "danger" : "warn",
      text: "Tăng lưu thông không khí, tránh làm ướt lá vào chiều tối, kiểm tra mặt dưới lá và không tưới thêm khi đất vẫn đủ ẩm.",
    });
  }

  if (typeof soil === "number" && Number.isFinite(soil) && soil > 80) {
    items.push({
      tag: "Ưu tiên cao · Đất ẩm cao / úng",
      tone: "danger",
      text: "Tạm hoãn tưới, kiểm tra lỗ thoát nước và tình trạng vùng rễ để hạn chế úng và duy trì thông khí cho rễ.",
    });
  }

  if (
    isDaytimeNow(now) &&
    typeof lux === "number" &&
    Number.isFinite(lux) &&
    lux < 5000
  ) {
    items.push({
      tag: "Cảnh báo · Thiếu sáng ban ngày",
      tone: "warn",
      text: "Ánh sáng ban ngày dưới 5.000 lux: kiểm tra mái che, vị trí đặt cây và vật cản ánh sáng.",
    });
  }

  const individualEvals = [
    { key: "Nhiệt độ", ev: tEval },
    { key: "Độ ẩm KK", ev: hEval },
    { key: "Độ ẩm đất", ev: sEval },
    { key: "Ánh sáng", ev: lEval },
  ];

  for (const { key, ev } of individualEvals) {
    if (items.length >= 3) break;
    if (ev.level === "danger" || ev.level === "warn" || ev.level === "monitor") {
      const alreadyCovers = items.some((x) =>
        x.text.toLowerCase().includes(key.toLowerCase().slice(0, 6))
      );
      if (!alreadyCovers) {
        items.push({
          tag: `${key} · ${ev.status}`,
          tone: ev.level === "danger" ? "danger" : "warn",
          text: ev.advice,
        });
      }
    }
  }

  if (items.length === 0) {
    items.push({
      tag: "Bình thường · Môi trường thuận lợi",
      tone: "good",
      text: "Duy trì chế độ chăm sóc, thông thoáng và tưới hiện tại; tiếp tục theo dõi dữ liệu và không can thiệp thêm nếu chưa cần thiết.",
    });
  }

  return items.slice(0, 3);
}

function TomatoCareCard({
  temp,
  rh,
  soil,
  lux,
  hasData,
  isViewingPastDate,
  selectedDate,
  lastUpdate,
  now,
}) {
  const recommendations = useMemo(
    () =>
      buildCombinedCareRecommendations({
        temp,
        rh,
        soil,
        lux,
        hasData,
        now,
      }),
    [temp, rh, soil, lux, hasData, now]
  );

  const toneStyles = {
    good: {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      badgeBg: "#dcfce7",
      badgeColor: "#166534",
    },
    warn: {
      bg: "#fffbeb",
      border: "#fde68a",
      badgeBg: "#fef3c7",
      badgeColor: "#92400e",
    },
    danger: {
      bg: "#fef2f2",
      border: "#fecaca",
      badgeBg: "#fee2e2",
      badgeColor: "#991b1b",
    },
    monitor: {
      bg: "#f8fafc",
      border: "#e2e8f0",
      badgeBg: "#e2e8f0",
      badgeColor: "#334155",
    },
  };

  return (
    <section className="mon-status-card">
      <div className="mon-status-heading">
        <div className="mon-status-symbol">
          <Sparkles size={21} />
        </div>
        <div>
          <h3>Khuyến nghị chăm sóc cây cà chua</h3>
          <p>
            {isViewingPastDate
              ? `Mẫu cuối ngày ${selectedDate}`
              : `${
                  isDaytimeNow(now)
                    ? "Ban ngày (06:00–17:59)"
                    : "Ban đêm / Tối (18:00–05:59)"
                } · ${now.toLocaleTimeString("vi-VN")}`}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "12px",
        }}
      >
        {recommendations.map((item, idx) => {
          const st = toneStyles[item.tone] || toneStyles.monitor;
          return (
            <div
              key={idx}
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                background: st.bg,
                border: `1px solid ${st.border}`,
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {item.tone === "good" ? (
                  <CheckCircle2 size={15} color={st.badgeColor} />
                ) : (
                  <AlertTriangle size={15} color={st.badgeColor} />
                )}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: st.badgeBg,
                    color: st.badgeColor,
                  }}
                >
                  {item.tag}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: 1.45,
                  color: "#1e293b",
                }}
              >
                {item.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mon-status-row" style={{ marginTop: "12px" }}>
        <span>Cập nhật gần nhất</span>
        <strong>
          <Clock3 size={15} />
          {lastUpdate}
        </strong>
      </div>
    </section>
  );
}

function MonitoringSensorCard({ config, data, connected, isViewingPastDate }) {
  const Icon = config.icon;

  const values = data
    .map((item) => item[config.key])
    .filter((v) => typeof v === "number" && Number.isFinite(v));

  const current = values.length > 0 ? values.at(-1) : null;
  const average =
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  const minimum = values.length > 0 ? Math.min(...values) : null;
  const maximum = values.length > 0 ? Math.max(...values) : null;

  return (
    <article className={`mon-sensor-card ${config.theme}`}>
      <div className="mon-sensor-top">
        <div className="mon-sensor-icon">
          <Icon size={23} />
        </div>

        <span className="mon-current-label">
          {isViewingPastDate ? "Cuối ngày" : "Hiện tại"}
        </span>
      </div>

      <h3>{config.title}</h3>

      <div className="mon-sensor-value">
        {formatValue(current, config.digits)}
        <small>{config.unit}</small>
      </div>

      <div className="mon-sensor-statistics">
        <div>
          <span>Trung bình</span>
          <strong>
            {average !== null
              ? `${formatValue(average, config.digits)} ${config.unit}`
              : "--"}
          </strong>
        </div>

        <div>
          <span>Khoảng đo</span>
          <strong>
            {minimum !== null && maximum !== null
              ? `${formatValue(minimum, config.digits)} – ${formatValue(
                  maximum,
                  config.digits
                )}`
              : "--"}
          </strong>
        </div>
      </div>

      <div className="mon-sensor-bottom">
        <span className="mon-demo-dot" />
        {isViewingPastDate
          ? "Dữ liệu đã lưu"
          : connected
          ? "Dữ liệu thực ESP32"
          : "Chờ kết nối ESP32"}
        <span>{data.length} mẫu</span>
      </div>
    </article>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  connected,
  isViewingPastDate,
  selectedDate,
  children,
}) {
  const badgeText = isViewingPastDate
    ? `LỊCH SỬ · ${selectedDate}`
    : connected
    ? "REALTIME"
    : "OFFLINE";

  return (
    <section className="mon-chart-card">
      <div className="mon-chart-heading">
        <div className="mon-chart-title">
          <div className="mon-chart-icon">
            <Icon size={20} />
          </div>

          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
        </div>

        <span className="mon-chart-tag">{badgeText}</span>
      </div>

      <div className="mon-chart-canvas">{children}</div>
    </section>
  );
}

function Monitoring() {
  const [dailyStore, setDailyStore] = useState(() => loadDailyStore());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [running, setRunning] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const todayKey = toDateKey(now);
  const isViewingPastDate = selectedDate !== todayKey;

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const pollSensorOnce = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sensors`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const payload = await res.json();
      const hasValidReading =
        payload &&
        payload.status !== "No Data" &&
        !payload.error &&
        (Number(payload.temperature) !== 0 ||
          Number(payload.humidity) !== 0 ||
          Number(payload.soil_moisture) !== 0 ||
          Number(payload.soil_adc) !== 0 ||
          Number(payload.light_lux) !== 0);

      setConnected(Boolean(hasValidReading));

      if (!hasValidReading) {
        return;
      }

      const currentTime = new Date();
      const dateKey = toDateKey(currentTime);
      const point = {
        dateKey,
        time: formatTimeLabel(currentTime, intervalSeconds < 30),
        fullTime: formatTimeLabel(currentTime, true),
        temperature: Number(payload.temperature),
        humidity: Number(payload.humidity),
        soil: Number(payload.soil_moisture),
        light: Number(payload.light_lux),
      };

      setDailyStore((currentStore) => {
        const dayList = Array.isArray(currentStore[dateKey])
          ? currentStore[dateKey]
          : [];
        const last = dayList[dayList.length - 1];
        if (last && last.fullTime === point.fullTime) {
          return currentStore;
        }
        const updatedDayList = [...dayList, point].slice(-MAX_POINTS_PER_DAY);
        const updatedStore = {
          ...currentStore,
          [dateKey]: updatedDayList,
        };
        saveDailyStore(updatedStore);
        return updatedStore;
      });
    } catch {
      setConnected(false);
    }
  }, [intervalSeconds]);

  useEffect(() => {
    if (!running) return;

    pollSensorOnce();
    const timer = setInterval(pollSensorOnce, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [running, intervalSeconds, pollSensorOnce]);

  const data = useMemo(() => {
    return Array.isArray(dailyStore[selectedDate])
      ? dailyStore[selectedDate]
      : [];
  }, [dailyStore, selectedDate]);

  const recordedDates = useMemo(() => {
    return Object.keys(dailyStore).sort().reverse();
  }, [dailyStore]);

  const latestPoint = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1];
  }, [data]);

  const lastUpdate = useMemo(() => {
    if (!latestPoint) return "--:--:--";
    return latestPoint.fullTime;
  }, [latestPoint]);

  const resetSelectedDateHistory = () => {
    setDailyStore((currentStore) => {
      const updatedStore = { ...currentStore };
      delete updatedStore[selectedDate];
      saveDailyStore(updatedStore);
      return updatedStore;
    });
    if (!isViewingPastDate) {
      setRunning(true);
      pollSensorOnce();
    }
  };

  const windowSummary = useMemo(() => {
    const totalSeconds = data.length * intervalSeconds;
    if (totalSeconds < 60) return `${totalSeconds} giây`;
    const mins = Math.round(totalSeconds / 60);
    if (mins < 60) return `~${mins} phút`;
    const hours = (mins / 60).toFixed(1);
    return `~${hours} giờ`;
  }, [data.length, intervalSeconds]);

  return (
    <div className="monitoring-page">
      <section className="mon-toolbar">
        <div className="mon-toolbar-left">
          <div className="mon-live-icon">
            <Activity size={21} />
          </div>

          <div>
            <h3>Dữ liệu cảm biến</h3>
            <p>
              {isViewingPastDate
                ? `Xem lại dữ liệu đã lưu ngày ${selectedDate} (${data.length} mẫu)`
                : `Theo dõi biến đổi môi trường theo thời gian thực · ngày ${selectedDate} (tối đa ${MAX_POINTS_PER_DAY} mẫu/ngày · ${windowSummary})`}
            </p>
          </div>
        </div>

        <div className="mon-controls">
          <label className="mon-interval-label">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Calendar size={14} />
              Ngày đo
            </span>
            <input
              type="date"
              value={selectedDate}
              max={todayKey}
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedDate(event.target.value);
                }
              }}
            />
          </label>

          {recordedDates.length > 0 && (
            <label className="mon-interval-label">
              Ngày đã lưu
              <select
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              >
                {!recordedDates.includes(todayKey) && (
                  <option value={todayKey}>{todayKey} (Hôm nay)</option>
                )}
                {recordedDates.map((dKey) => (
                  <option key={dKey} value={dKey}>
                    {dKey} ({dailyStore[dKey]?.length || 0} mẫu)
                    {dKey === todayKey ? " · Hôm nay" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isViewingPastDate && (
            <button
              type="button"
              className="mon-control-button"
              onClick={() => setSelectedDate(todayKey)}
            >
              Về hôm nay
            </button>
          )}

          <label className="mon-interval-label">
            Chu kỳ lấy mẫu
            <select
              value={intervalSeconds}
              onChange={(event) =>
                setIntervalSeconds(Number(event.target.value))
              }
            >
              <option value={3}>3 giây</option>
              <option value={10}>10 giây</option>
              <option value={30}>30 giây</option>
              <option value={60}>60 giây (1 phút)</option>
              <option value={300}>300 giây (5 phút)</option>
            </select>
          </label>

          <button
            type="button"
            className="mon-control-button"
            onClick={resetSelectedDateHistory}
          >
            <RefreshCw size={17} />
            Làm mới
          </button>

          <button
            type="button"
            className="mon-control-button mon-primary-button"
            onClick={() => setRunning((value) => !value)}
          >
            {running ? <Pause size={17} /> : <Play size={17} />}
            {running ? "Tạm dừng" : "Tiếp tục"}
          </button>
        </div>
      </section>

      {isViewingPastDate && data.length === 0 && (
        <div className="mon-notice">
          <Info size={18} />
          <span>
            Không có dữ liệu đo nào được lưu trên trình duyệt cho ngày{" "}
            <strong>{selectedDate}</strong>.
          </span>
        </div>
      )}

      {!isViewingPastDate && !connected && (
        <div className="mon-notice">
          <Info size={18} />
          <span>
            Chưa nhận được dữ liệu cảm biến thực từ backend Flask
            (`http://127.0.0.1:5000/api/sensors`). Hãy kiểm tra kết nối ESP32
            và cổng serial trên backend.
          </span>
        </div>
      )}

      <section className="mon-sensors-grid">
        {sensorConfig.map((config) => (
          <MonitoringSensorCard
            key={config.key}
            config={config}
            data={data}
            connected={connected}
            isViewingPastDate={isViewingPastDate}
          />
        ))}
      </section>

      <section className="mon-charts-grid">
        <ChartCard
          title="Nhiệt độ & độ ẩm không khí"
          subtitle="Biến đổi nhiệt độ và độ ẩm theo trục thời gian"
          icon={Thermometer}
          connected={connected}
          isViewingPastDate={isViewingPastDate}
          selectedDate={selectedDate}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 12, right: 12, left: -14, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 5" stroke="#e7eef5" />
              <XAxis
                dataKey="time"
                stroke="#9caaba"
                tick={{ fontSize: 11 }}
                minTickGap={36}
              />
              <YAxis
                yAxisId="temperature"
                stroke="#df9874"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
              />
              <YAxis
                yAxisId="humidity"
                orientation="right"
                stroke="#7b9fda"
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
              />
              <Tooltip />
              <Legend />

              <Line
                yAxisId="temperature"
                type="monotone"
                dataKey="temperature"
                name="Nhiệt độ (°C)"
                stroke="#e89a78"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="humidity"
                type="monotone"
                dataKey="humidity"
                name="Độ ẩm (%)"
                stroke="#84a7dd"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Độ ẩm đất"
          subtitle="Biến thiên độ ẩm vùng rễ theo thời gian (%)"
          icon={Sprout}
          connected={connected}
          isViewingPastDate={isViewingPastDate}
          selectedDate={selectedDate}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 12, left: -14, bottom: 0 }}
            >
              <defs>
                <linearGradient id="monSoilFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#85cda5" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="#85cda5" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 5" stroke="#e7eef5" />
              <XAxis
                dataKey="time"
                stroke="#9caaba"
                tick={{ fontSize: 11 }}
                minTickGap={36}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#86ac99"
                tick={{ fontSize: 11 }}
              />
              <Tooltip />

              <Area
                type="monotone"
                dataKey="soil"
                name="Độ ẩm đất (%)"
                stroke="#70bb92"
                strokeWidth={3}
                fill="url(#monSoilFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Cường độ ánh sáng"
          subtitle="Biến đổi cường độ ánh sáng theo thời gian (lux)"
          icon={Sun}
          connected={connected}
          isViewingPastDate={isViewingPastDate}
          selectedDate={selectedDate}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 12, left: -14, bottom: 0 }}
            >
              <defs>
                <linearGradient id="monLightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f1cf81" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f1cf81" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 5" stroke="#e7eef5" />
              <XAxis
                dataKey="time"
                stroke="#9caaba"
                tick={{ fontSize: 11 }}
                minTickGap={36}
              />
              <YAxis
                stroke="#c5ad77"
                tick={{ fontSize: 11 }}
                width={55}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip />

              <Area
                type="monotone"
                dataKey="light"
                name="Ánh sáng (lux)"
                stroke="#e4bc69"
                strokeWidth={3}
                fill="url(#monLightFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <TomatoCareCard
          temp={latestPoint?.temperature}
          rh={latestPoint?.humidity}
          soil={latestPoint?.soil}
          lux={latestPoint?.light}
          hasData={data.length > 0}
          isViewingPastDate={isViewingPastDate}
          selectedDate={selectedDate}
          lastUpdate={lastUpdate}
          now={now}
        />
      </section>
    </div>
  );
}

export default Monitoring;