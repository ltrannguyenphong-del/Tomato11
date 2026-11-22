import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Activity, RefreshCw } from "lucide-react";
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
import {
  METRIC_CONFIG,
  formatMetricNumber,
  normalizeMetricKey,
  readMonitoringDayPoints,
  toLocalDateKey,
} from "../utils/sharedSensorSeries";

const SYNC_MS = 1500;

export default function MetricChartModal({
  metricKey,
  onClose,
  onSelectMetric,
}) {
  const normalizedKey = normalizeMetricKey(metricKey);
  const cfg = METRIC_CONFIG[normalizedKey] || null;

  const [points, setPoints] = useState([]);
  const [dualMode, setDualMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const todayKey = toLocalDateKey(new Date());
  const canPairTempHumidity =
    normalizedKey === "temperature" || normalizedKey === "humidity";

  const syncFromMonitoringStorage = useCallback(() => {
    setRefreshing(true);
    try {
      const dayList = readMonitoringDayPoints(toLocalDateKey(new Date()));
      setPoints(dayList);
    } finally {
      setTimeout(() => setRefreshing(false), 180);
    }
  }, []);

  useEffect(() => {
    if (!cfg) return;
    syncFromMonitoringStorage();

    const timer = setInterval(syncFromMonitoringStorage, SYNC_MS);
    const onStorage = (e) => {
      if (!e.key || e.key === "tomato_smartcare_daily_history_v1") {
        syncFromMonitoringStorage();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [cfg, syncFromMonitoringStorage]);

  useEffect(() => {
    if (!canPairTempHumidity) {
      setDualMode(false);
    }
  }, [canPairTempHumidity]);

  useEffect(() => {
    if (!cfg) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cfg, onClose]);

  const stats = useMemo(() => {
    if (!cfg || !points.length) {
      return { latest: "--", min: "--", max: "--", avg: "--" };
    }
    const vals = points
      .map((p) => Number(p[cfg.key]))
      .filter((n) => typeof n === "number" && Number.isFinite(n));

    if (!vals.length) {
      return { latest: "--", min: "--", max: "--", avg: "--" };
    }

    const avgNum = vals.reduce((a, b) => a + b, 0) / vals.length;
    return {
      latest: formatMetricNumber(vals.at(-1), cfg.digits),
      min: formatMetricNumber(Math.min(...vals), cfg.digits),
      max: formatMetricNumber(Math.max(...vals), cfg.digits),
      avg: formatMetricNumber(avgNum, cfg.digits),
    };
  }, [cfg, points]);

  if (!cfg) return null;

  const gradientId = `modalGrad_${cfg.key}`;
  const xKey = points.some((p) => p.fullTime) ? "fullTime" : "time";

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Đồ thị ${cfg.label}`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "700px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "20px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.22)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={21} color={cfg.stroke} />
            <div>
              <h3 style={{ margin: 0, fontSize: "18px" }}>{cfg.label}</h3>
              <small style={{ color: "#64748b" }}>
                Đồng bộ dữ liệu Giám sát IoT · Ngày {todayKey}
              </small>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                padding: "4px 8px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#475569",
              }}
            >
              REALTIME
            </span>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ đồ thị"
              style={{
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                borderRadius: "10px",
                padding: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Thanh chuyển nhanh giữa 4 chỉ số + gộp Nhiệt độ & Độ ẩm */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {Object.values(METRIC_CONFIG).map((item) => {
              const active = item.key === cfg.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectMetric?.(item.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "999px",
                    border: "1px solid",
                    borderColor: active ? item.stroke : "#cbd5e1",
                    background: active ? "#f8fafc" : "#ffffff",
                    color: active ? "#0f172a" : "#475569",
                    fontWeight: active ? 600 : 400,
                    fontSize: "12.5px",
                    cursor: "pointer",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {canPairTempHumidity && (
            <button
              type="button"
              onClick={() => setDualMode((v) => !v)}
              style={{
                padding: "5px 11px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: dualMode ? "#eff6ff" : "#f8fafc",
                color: "#0f172a",
                fontSize: "12px",
                fontWeight: dualMode ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {dualMode
                ? "Đang gộp Nhiệt & Độ ẩm"
                : "Gộp Nhiệt độ & Độ ẩm"}
            </button>
          )}
        </div>

        {/* Khung đồ thị Recharts giống Giám sát IoT */}
        <div
          style={{
            width: "100%",
            height: "250px",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "10px 8px 4px",
          }}
        >
          {points.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
                fontSize: "13.5px",
              }}
            >
              Chưa có mẫu đo nào cho ngày {todayKey} trong bộ nhớ Giám sát IoT.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {canPairTempHumidity && dualMode ? (
                <LineChart
                  data={points}
                  margin={{ top: 10, right: 12, left: -14, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 5" stroke="#e7eef5" />
                  <XAxis
                    dataKey={xKey}
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
              ) : cfg.chartType === "area" ? (
                <AreaChart
                  data={points}
                  margin={{ top: 10, right: 12, left: -14, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={cfg.fillColor}
                        stopOpacity={0.38}
                      />
                      <stop
                        offset="100%"
                        stopColor={cfg.fillColor}
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 5" stroke="#e7eef5" />
                  <XAxis
                    dataKey={xKey}
                    stroke="#9caaba"
                    tick={{ fontSize: 11 }}
                    minTickGap={36}
                  />
                  <YAxis
                    domain={cfg.yDomain}
                    stroke={cfg.axisColor}
                    tick={{ fontSize: 11 }}
                    width={cfg.key === "light" ? 55 : undefined}
                    tickFormatter={
                      cfg.key === "light"
                        ? (v) => `${Math.round(v / 1000)}k`
                        : undefined
                    }
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey={cfg.key}
                    name={cfg.shortLabel}
                    stroke={cfg.stroke}
                    strokeWidth={3}
                    fill={`url(#${gradientId})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <LineChart
                  data={points}
                  margin={{ top: 10, right: 12, left: -14, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 5" stroke="#e7eef5" />
                  <XAxis
                    dataKey={xKey}
                    stroke="#9caaba"
                    tick={{ fontSize: 11 }}
                    minTickGap={36}
                  />
                  <YAxis
                    domain={cfg.yDomain}
                    stroke={cfg.axisColor}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey={cfg.key}
                    name={cfg.shortLabel}
                    stroke={cfg.stroke}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Thống kê giống thẻ chỉ số Giám sát IoT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "10px",
            marginTop: "14px",
            fontSize: "13px",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "12px" }}>Hiện tại</div>
            <strong style={{ fontSize: "15px" }}>
              {stats.latest} {cfg.unit}
            </strong>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "12px" }}>Trung bình</div>
            <strong style={{ fontSize: "15px" }}>
              {stats.avg} {cfg.unit}
            </strong>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "12px" }}>Thấp nhất</div>
            <strong style={{ fontSize: "15px" }}>
              {stats.min} {cfg.unit}
            </strong>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "#f8fafc",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#64748b", fontSize: "12px" }}>Cao nhất</div>
            <strong style={{ fontSize: "15px" }}>
              {stats.max} {cfg.unit}
            </strong>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "12px",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <span>Số mẫu đã ghi: {points.length} mẫu</span>

          <button
            type="button"
            onClick={syncFromMonitoringStorage}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <RefreshCw size={12} /> {refreshing ? "Đang đồng bộ..." : "Đồng bộ ngay"}
          </button>
        </div>
      </div>
    </div>
  );
}