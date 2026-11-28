import { useEffect, useState } from "react";
import { Sliders, RotateCcw, Flame, Droplets, Sun } from "lucide-react";
import {
  DEFAULT_MOCK_SENSOR,
  appendPointToMonitoringHistory,
  generateMockReading,
  isMockDriftEnabled,
  isMockSensorEnabled,
  loadMockBaseValues,
  saveMockBaseValues,
  setMockDriftEnabled,
  setMockSensorEnabled,
} from "../utils/mockSensorEmulator";

export function isMockSoil60Enabled() {
  return true;
}

export function getMockSoilAround60(dateObj = new Date(), drift = true) {
  if (!drift) return 60.0;
  const seconds = dateObj.getTime() / 1000;
  const wave = Math.sin(seconds / 4) * 1.1 + Math.cos(seconds / 9) * 0.4;
  return Number(Math.min(64, Math.max(56, 60 + wave)).toFixed(1));
}

export default function MockSensorPanel({ onApplied }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(() => isMockSensorEnabled());
  const [drift, setDrift] = useState(() => isMockDriftEnabled());
  const [form, setForm] = useState(() => loadMockBaseValues());

  useEffect(() => {
    setForm(loadMockBaseValues());
    setEnabled(isMockSensorEnabled());
    setDrift(isMockDriftEnabled());
  }, [open]);

  const emitReading = (now = new Date()) => {
    const reading = generateMockReading(now);
    const finalReading = isMockSoil60Enabled()
      ? {
          ...reading,
          soil_moisture: getMockSoilAround60(now, drift),
          soil_calibrated: true,
        }
      : reading;
    appendPointToMonitoringHistory(finalReading, now);
    onApplied?.(finalReading);
    return finalReading;
  };

  const applyValues = (nextValues) => {
    const saved = saveMockBaseValues(nextValues);
    setForm(saved);
    emitReading(new Date());
  };

  const handleToggleEnabled = (checked) => {
    setEnabled(checked);
    setMockSensorEnabled(checked);
    if (checked) {
      emitReading(new Date());
    }
  };

  const handleToggleDrift = (checked) => {
    setDrift(checked);
    setMockDriftEnabled(checked);
  };

  return (
    <div
      style={{
        background: "#fff8fb",
        border: "1px solid #f5d0de",
        borderRadius: "16px",
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Sliders size={18} color="#db2777" />
          <div>
            <strong style={{ fontSize: "14px" }}>
              Bộ giả lập cảm biến (không cần ESP32 / Flask)
            </strong>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Trạng thái: <strong>{enabled ? "Đang bật" : "Đang tắt"}</strong> ·
              Cho phép sửa số đo trực tiếp để test giao diện &amp; đồ thị
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
            />
            Bật dữ liệu giả lập
          </label>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={drift}
              onChange={(e) => handleToggleDrift(e.target.checked)}
            />
            Dao động nhẹ
          </label>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              padding: "6px 12px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {open ? "Thu gọn" : "Sửa giá trị"}
          </button>
        </div>
      </div>

      {open && (
        <div
          style={{
            marginTop: "14px",
            paddingTop: "14px",
            borderTop: "1px dashed #fbcfe8",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
            }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12.5px",
              }}
            >
              <span>Nhiệt độ (°C)</span>
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={(e) =>
                  setForm((p) => ({ ...p, temperature: e.target.value }))
                }
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12.5px",
              }}
            >
              <span>Độ ẩm KK (% RH)</span>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={form.humidity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, humidity: e.target.value }))
                }
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12.5px",
              }}
            >
              <span>Độ ẩm đất (%)</span>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={form.soil_moisture}
                onChange={(e) =>
                  setForm((p) => ({ ...p, soil_moisture: e.target.value }))
                }
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                fontSize: "12.5px",
              }}
            >
              <span>Ánh sáng (lux)</span>
              <input
                type="number"
                step="100"
                min="0"
                value={form.light_lux}
                onChange={(e) =>
                  setForm((p) => ({ ...p, light_lux: e.target.value }))
                }
                style={{
                  padding: "7px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => applyValues(form)}
              style={{
                padding: "7px 14px",
                borderRadius: "10px",
                border: "none",
                background: "#db2777",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Áp dụng ngay
            </button>

            <button
              type="button"
              onClick={() => applyValues(DEFAULT_MOCK_SENSOR)}
              style={{
                padding: "7px 12px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <RotateCcw size={13} /> Mặc định tốt
            </button>

            <button
              type="button"
              onClick={() =>
                applyValues({
                  temperature: 36.2,
                  humidity: 92,
                  soil_moisture: 60,
                  light_lux: 22000,
                })
              }
              style={{
                padding: "7px 12px",
                borderRadius: "10px",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#991b1b",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Flame size={13} /> Nóng &amp; ẩm cao (&gt;90%)
            </button>

            <button
              type="button"
              onClick={() =>
                applyValues({
                  temperature: 31.5,
                  humidity: 48,
                  soil_moisture: 60,
                  light_lux: 26000,
                })
              }
              style={{
                padding: "7px 12px",
                borderRadius: "10px",
                border: "1px solid #fde68a",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Droplets size={13} /> Nắng &amp; khô KK
            </button>

            <button
              type="button"
              onClick={() =>
                applyValues({
                  temperature: 26.0,
                  humidity: 70,
                  soil_moisture: 60,
                  light_lux: 1800,
                })
              }
              style={{
                padding: "7px 12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                fontSize: "12.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Sun size={13} /> Thiếu sáng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}