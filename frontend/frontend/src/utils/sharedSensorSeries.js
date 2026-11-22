const DAILY_STORAGE_KEY = "tomato_smartcare_daily_history_v1";

export const METRIC_CONFIG = {
  temperature: {
    key: "temperature",
    label: "Nhiệt độ không khí",
    shortLabel: "Nhiệt độ (°C)",
    unit: "°C",
    digits: 1,
    stroke: "#e89a78",
    axisColor: "#df9874",
    fillColor: "#e89a78",
    chartType: "line",
    yDomain: ["auto", "auto"],
  },
  humidity: {
    key: "humidity",
    label: "Độ ẩm không khí",
    shortLabel: "Độ ẩm (%)",
    unit: "%",
    digits: 0,
    stroke: "#84a7dd",
    axisColor: "#7b9fda",
    fillColor: "#84a7dd",
    chartType: "line",
    yDomain: [0, 100],
  },
  soil: {
    key: "soil",
    label: "Độ ẩm đất",
    shortLabel: "Độ ẩm đất (%)",
    unit: "%",
    digits: 1,
    stroke: "#70bb92",
    axisColor: "#86ac99",
    fillColor: "#85cda5",
    chartType: "area",
    yDomain: [0, 100],
  },
  light: {
    key: "light",
    label: "Ánh sáng",
    shortLabel: "Ánh sáng (lux)",
    unit: "lux",
    digits: 0,
    stroke: "#e4bc69",
    axisColor: "#c5ad77",
    fillColor: "#f1cf81",
    chartType: "area",
    yDomain: [0, "auto"],
  },
};

export function toLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Chuyển key thẻ ở Tổng quan ("soil_moisture", "light_lux") sang key chuẩn của Monitoring.jsx ("soil", "light")
export function normalizeMetricKey(rawKey) {
  if (rawKey === "soil_moisture") return "soil";
  if (rawKey === "light_lux") return "light";
  return rawKey;
}

export function readMonitoringDayPoints(dateKey = toLocalDateKey(new Date())) {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed?.[dateKey]) ? parsed[dateKey] : [];
    return list;
  } catch {
    return [];
  }
}

export function formatMetricNumber(val, digits = 1) {
  if (typeof val !== "number" || !Number.isFinite(val)) return "--";
  return val.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}