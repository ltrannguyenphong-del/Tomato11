
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Thermometer,
  Droplets,
  Sprout,
  Sun,
  WifiOff,
  Play,
  Pause,
  RefreshCw,
  Database,
  Clock3,
  Info,
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

const MAX_POINTS = 24;

const initialData = [
  { time: "08:00", temperature: 26.1, humidity: 71, soil: 63, light: 9100 },
  { time: "08:05", temperature: 26.5, humidity: 70, soil: 62, light: 9800 },
  { time: "08:10", temperature: 27.0, humidity: 69, soil: 62, light: 10500 },
  { time: "08:15", temperature: 27.4, humidity: 68, soil: 61, light: 11600 },
  { time: "08:20", temperature: 27.1, humidity: 70, soil: 61, light: 11200 },
  { time: "08:25", temperature: 27.7, humidity: 69, soil: 60, light: 12400 },
  { time: "08:30", temperature: 28.0, humidity: 67, soil: 59, light: 13200 },
  { time: "08:35", temperature: 27.8, humidity: 68, soil: 59, light: 12800 },
  { time: "08:40", temperature: 28.4, humidity: 66, soil: 58, light: 13500 },
  { time: "08:45", temperature: 28.2, humidity: 67, soil: 58, light: 12500 },
];

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
    digits: 0,
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

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const round = (value, digits = 0) =>
  Number(value.toFixed(digits));

function makeNextPoint(previous) {
  const now = new Date();

  return {
    time: now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    temperature: round(
      clamp(previous.temperature + (Math.random() - 0.5) * 0.9, 23, 35),
      1
    ),
    humidity: round(
      clamp(previous.humidity + (Math.random() - 0.5) * 3, 40, 95)
    ),
    soil: round(
      clamp(previous.soil + (Math.random() - 0.5) * 2, 20, 90)
    ),
    light: round(
      clamp(previous.light + (Math.random() - 0.5) * 1200, 200, 25000)
    ),
  };
}

function formatValue(value, digits = 0) {
  if (!Number.isFinite(value)) return "--";

  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function MonitoringSensorCard({ config, data }) {
  const Icon = config.icon;

  const values = data.map((item) => item[config.key]);
  const current = values.at(-1);
  const average =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  return (
    <article className={`mon-sensor-card ${config.theme}`}>
      <div className="mon-sensor-top">
        <div className="mon-sensor-icon">
          <Icon size={23} />
        </div>

        <span className="mon-current-label">
          Hiện tại
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
            {formatValue(average, config.digits)} {config.unit}
          </strong>
        </div>

        <div>
          <span>Khoảng đo</span>
          <strong>
            {formatValue(minimum, config.digits)}
            {" – "}
            {formatValue(maximum, config.digits)}
          </strong>
        </div>
      </div>

      <div className="mon-sensor-bottom">
        <span className="mon-demo-dot" />
        Dữ liệu mô phỏng
        <span>{data.length} lần đo</span>
      </div>
    </article>
  );
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
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

        <span className="mon-chart-tag">LIVE DEMO</span>
      </div>

      <div className="mon-chart-canvas">
        {children}
      </div>
    </section>
  );
}

function Monitoring() {
  const [data, setData] = useState(initialData);
  const [running, setRunning] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState(3);

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setData((current) => {
        const previous = current[current.length - 1];
        const next = makeNextPoint(previous);

        return [...current, next].slice(-MAX_POINTS);
      });
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [running, intervalSeconds]);

  const latest = data[data.length - 1];

  const lastUpdate = useMemo(
    () => latest.time,
    [latest]
  );

  const resetSimulation = () => {
    setData(initialData);
    setRunning(true);
  };

  return (
    <div className="monitoring-page">
      <section className="mon-intro">
        <div className="mon-intro-content">
          <span className="mon-eyebrow">
            ✿ MY LITTLE SENSOR STUDIO
          </span>

          <h2>Giám sát khu vườn ♡</h2>

          <p>
            Cùng theo dõi sự thay đổi của nhiệt độ,
            độ ẩm và ánh sáng trong khu vườn cà chua.
          </p>

          <div className="mon-intro-tags">
            <span>☁ Pastel Blue</span>
            <span>🌱 Smart Garden</span>
            <span>📈 Live Charts</span>
          </div>
        </div>

        <div className="mon-intro-art" aria-hidden="true">
          <span className="mon-cloud">☁️</span>
          <span className="mon-sprout">🌱</span>
          <span className="mon-sun">☀️</span>
        </div>
      </section>

      <section className="mon-toolbar">
        <div className="mon-toolbar-left">
          <div className="mon-live-icon">
            <Activity size={21} />
          </div>

          <div>
            <h3>Dữ liệu cảm biến</h3>
            <p>
              Dữ liệu giả lập để thử nghiệm giao diện
            </p>
          </div>
        </div>

        <div className="mon-controls">
          <label className="mon-interval-label">
            Chu kỳ mô phỏng
            <select
              value={intervalSeconds}
              onChange={(event) =>
                setIntervalSeconds(Number(event.target.value))
              }
            >
              <option value={1}>1 giây</option>
              <option value={3}>3 giây</option>
              <option value={5}>5 giây</option>
              <option value={10}>10 giây</option>
            </select>
          </label>

          <button
            type="button"
            className="mon-control-button"
            onClick={resetSimulation}
          >
            <RefreshCw size={17} />
            Đặt lại
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

      <div className="mon-notice">
        <Info size={18} />
        <span>
          Đang sử dụng dữ liệu mô phỏng, không phải dữ liệu
          ESP32. Các chỉ số chỉ phục vụ kiểm tra dashboard.
        </span>
      </div>

      <section className="mon-sensors-grid">
        {sensorConfig.map((config) => (
          <MonitoringSensorCard
            key={config.key}
            config={config}
            data={data}
          />
        ))}
      </section>

      <section className="mon-charts-grid">
        <ChartCard
          title="Nhiệt độ & độ ẩm không khí"
          subtitle="Theo dõi sự thay đổi theo thời gian"
          icon={Thermometer}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 12, right: 12, left: -14, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 5"
                stroke="#e7eef5"
              />
              <XAxis
                dataKey="time"
                stroke="#9caaba"
                tick={{ fontSize: 11 }}
                minTickGap={20}
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
          subtitle="Biến thiên độ ẩm vùng rễ (%)"
          icon={Sprout}
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
                minTickGap={20}
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
          subtitle="Theo dõi ánh sáng theo lux"
          icon={Sun}
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
                minTickGap={20}
              />
              <YAxis
                stroke="#c5ad77"
                tick={{ fontSize: 11 }}
                width={55}
                tickFormatter={(value) =>
                  `${Math.round(value / 1000)}k`
                }
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

        <section className="mon-status-card">
          <div className="mon-status-heading">
            <div className="mon-status-symbol">
              <Database size={21} />
            </div>
            <div>
              <h3>Trạng thái hệ thống</h3>
              <p>Thông tin kết nối và mô phỏng</p>
            </div>
          </div>

          <div className="mon-status-row">
            <span>Chế độ</span>
            <strong className="mon-text-demo">
              Mô phỏng
            </strong>
          </div>

          <div className="mon-status-row">
            <span>ESP32</span>
            <strong className="mon-text-offline">
              <WifiOff size={15} />
              Chưa kết nối
            </strong>
          </div>

          <div className="mon-status-row">
            <span>Biểu đồ</span>
            <strong className="mon-text-online">
              {running ? "Đang cập nhật" : "Đã tạm dừng"}
            </strong>
          </div>

          <div className="mon-status-row">
            <span>Số điểm dữ liệu</span>
            <strong>{data.length}</strong>
          </div>

          <div className="mon-status-row">
            <span>Cập nhật gần nhất</span>
            <strong>
              <Clock3 size={15} />
              {lastUpdate}
            </strong>
          </div>

          <div className="mon-status-footnote">
            🍅 Khi có ESP32, chúng ta sẽ thay nguồn dữ liệu
            mô phỏng bằng dữ liệu API từ Flask.
          </div>
        </section>
      </section>
    </div>
  );
}

export default Monitoring;
