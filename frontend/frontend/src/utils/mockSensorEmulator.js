const DAILY_STORAGE_KEY = "tomato_smartcare_daily_history_v1";
const MOCK_ENABLED_KEY = "tomato_smartcare_mock_sensor_enabled_v1";
const MOCK_VALUES_KEY = "tomato_smartcare_mock_sensor_values_v1";
const MOCK_DRIFT_KEY = "tomato_smartcare_mock_sensor_drift_v1";
const MAX_POINTS_PER_DAY = 288;

export const DEFAULT_MOCK_SENSOR = {
  temperature: 29.5,
  humidity: 72,
  soil_moisture: 58.0,
  soil_adc: 1850,
  light_lux: 14500,
  soil_calibrated: true,
  status: "Mock OK",
};

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

export function isMockSensorEnabled() {
  try {
    const raw = localStorage.getItem(MOCK_ENABLED_KEY);
    if (raw === null) return true; // Mặc định bật khi chưa có cấu hình
    return raw === "true";
  } catch {
    return true;
  }
}

export function setMockSensorEnabled(enabled) {
  try {
    localStorage.setItem(MOCK_ENABLED_KEY, String(Boolean(enabled)));
    window.dispatchEvent(new Event("tomato-mock-sensor-updated"));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
}

export function isMockDriftEnabled() {
  try {
    const raw = localStorage.getItem(MOCK_DRIFT_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setMockDriftEnabled(enabled) {
  try {
    localStorage.setItem(MOCK_DRIFT_KEY, String(Boolean(enabled)));
    window.dispatchEvent(new Event("tomato-mock-sensor-updated"));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
}

export function loadMockBaseValues() {
  try {
    const raw = localStorage.getItem(MOCK_VALUES_KEY);
    if (!raw) return { ...DEFAULT_MOCK_SENSOR };
    const parsed = JSON.parse(raw);
    return {
      temperature: Number.isFinite(Number(parsed?.temperature))
        ? Number(parsed.temperature)
        : DEFAULT_MOCK_SENSOR.temperature,
      humidity: Number.isFinite(Number(parsed?.humidity))
        ? Number(parsed.humidity)
        : DEFAULT_MOCK_SENSOR.humidity,
      soil_moisture: Number.isFinite(Number(parsed?.soil_moisture))
        ? Number(parsed.soil_moisture)
        : DEFAULT_MOCK_SENSOR.soil_moisture,
      soil_adc: Number.isFinite(Number(parsed?.soil_adc))
        ? Number(parsed.soil_adc)
        : DEFAULT_MOCK_SENSOR.soil_adc,
      light_lux: Number.isFinite(Number(parsed?.light_lux))
        ? Number(parsed.light_lux)
        : DEFAULT_MOCK_SENSOR.light_lux,
      soil_calibrated:
        parsed?.soil_calibrated !== undefined
          ? Boolean(parsed.soil_calibrated)
          : true,
      status: "Mock OK",
    };
  } catch {
    return { ...DEFAULT_MOCK_SENSOR };
  }
}

export function saveMockBaseValues(nextValues) {
  const clean = {
    temperature: Number(nextValues.temperature),
    humidity: Number(nextValues.humidity),
    soil_moisture: Number(nextValues.soil_moisture),
    soil_adc: Number.isFinite(Number(nextValues.soil_adc))
      ? Number(nextValues.soil_adc)
      : Math.round(
          4095 - (Math.max(0, Math.min(100, Number(nextValues.soil_moisture))) / 100) * 2800
        ),
    light_lux: Number(nextValues.light_lux),
    soil_calibrated:
      nextValues.soil_calibrated !== undefined
        ? Boolean(nextValues.soil_calibrated)
        : true,
    status: "Mock OK",
  };

  try {
    localStorage.setItem(MOCK_VALUES_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event("tomato-mock-sensor-updated"));
  } catch {
    // Bỏ qua nếu đầy bộ nhớ
  }
  return clean;
}

export function generateMockReading(now = new Date()) {
  const base = loadMockBaseValues();
  const drift = isMockDriftEnabled();

  if (!drift) {
    return { ...base };
  }

  const tSec = now.getTime() / 1000;
  const tempJitter = Math.sin(tSec / 18) * 0.4;
  const humJitter = Math.cos(tSec / 22) * 1.5;
  const soilJitter = Math.sin(tSec / 30) * 1.0;
  const lightJitter = Math.cos(tSec / 15) * 350;

  const temperature = Number((base.temperature + tempJitter).toFixed(1));
  const humidity = Number(
    Math.max(0, Math.min(100, base.humidity + humJitter)).toFixed(1)
  );
  const soil_moisture = Number(
    Math.max(0, Math.min(100, base.soil_moisture + soilJitter)).toFixed(1)
  );
  const light_lux = Math.max(0, Math.round(base.light_lux + lightJitter));
  const soil_adc = Math.max(
    0,
    Math.min(4095, Math.round(4095 - (soil_moisture / 100) * 2800))
  );

  return {
    temperature,
    humidity,
    soil_moisture,
    soil_adc,
    light_lux,
    soil_calibrated: base.soil_calibrated,
    status: "Mock OK",
  };
}

export function appendPointToMonitoringHistory(reading, now = new Date()) {
  if (!reading) return;
  const dateKey = toDateKey(now);
  const point = {
    dateKey,
    time: formatTimeLabel(now, true),
    fullTime: formatTimeLabel(now, true),
    temperature: Number(reading.temperature),
    humidity: Number(reading.humidity),
    soil: Number(reading.soil_moisture),
    light: Number(reading.light_lux),
  };

  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const safeStore = store && typeof store === "object" ? { ...store } : {};
    const dayList = Array.isArray(safeStore[dateKey]) ? safeStore[dateKey] : [];

    const last = dayList[dayList.length - 1];
    if (last && last.fullTime === point.fullTime) {
      return;
    }

    safeStore[dateKey] = [...dayList, point].slice(-MAX_POINTS_PER_DAY);

    const sortedKeys = Object.keys(safeStore).sort().slice(-30);
    const trimmed = {};
    for (const k of sortedKeys) {
      trimmed[k] = safeStore[k];
    }
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Bỏ qua nếu đầy bộ nhớ
  }
}

export function seedInitialMockHistory(count = 12, stepSeconds = 10, now = new Date()) {
  const dateKey = toDateKey(now);
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    const safeStore = store && typeof store === "object" ? { ...store } : {};
    const existing = Array.isArray(safeStore[dateKey]) ? safeStore[dateKey] : [];

    if (existing.length > 0) return;

    const seeded = [];
    for (let i = count - 1; i >= 0; i--) {
      const ptDate = new Date(now.getTime() - i * stepSeconds * 1000);
      const reading = generateMockReading(ptDate);
      seeded.push({
        dateKey,
        time: formatTimeLabel(ptDate, true),
        fullTime: formatTimeLabel(ptDate, true),
        temperature: Number(reading.temperature),
        humidity: Number(reading.humidity),
        soil: Number(reading.soil_moisture),
        light: Number(reading.light_lux),
      });
    }

    safeStore[dateKey] = seeded.slice(-MAX_POINTS_PER_DAY);
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(safeStore));
  } catch {
    // Bỏ qua nếu đầy bộ nhớ
  }
}