
import { useState } from "react";
import {
  Settings2,
  Thermometer,
  Droplets,
  Sprout,
  Sun,
  Bell,
  Clock3,
  Wifi,
  Server,
  Camera,
  Save,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import "../styles/settings.css";

const STORAGE_KEY = "tomato-smartcare-settings-v1";

const defaultSettings = {
  temperatureMin: 18,
  temperatureMax: 35,
  humidityMin: 45,
  humidityMax: 85,
  soilMin: 30,
  soilMax: 80,
  lightMin: 300,
  lightMax: 30000,
  updateInterval: 10,
  environmentAlerts: true,
  aiAlerts: true,
  showNotifications: true,
};

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return { ...defaultSettings };

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return { ...defaultSettings };
    }

    return { ...defaultSettings, ...parsed };
  } catch {
    return { ...defaultSettings };
  }
}

const sensorFields = [
  {
    key: "temperature",
    title: "Nhiệt độ",
    unit: "°C",
    icon: Thermometer,
    min: 0,
    max: 60,
    step: 1,
  },
  {
    key: "humidity",
    title: "Độ ẩm không khí",
    unit: "%",
    icon: Droplets,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "soil",
    title: "Độ ẩm đất",
    unit: "%",
    icon: Sprout,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "light",
    title: "Ánh sáng",
    unit: "lux",
    icon: Sun,
    min: 0,
    max: 100000,
    step: 100,
  },
];

function ToggleRow({ icon: Icon, title, description, checked, onChange }) {
  return (
    <label className="settings-toggle-row">
      <span className="settings-toggle-icon">
        <Icon size={18} />
      </span>

      <span className="settings-toggle-description">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="settings-toggle-input"
      />

      <span className="settings-toggle-switch" aria-hidden="true" />
    </label>
  );
}

function Settings() {
  const [settings, setSettings] = useState(loadSettings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateSetting = (key, value) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage("");
    setError("");
  };

  const validate = () => {
    for (const sensor of sensorFields) {
      const min = Number(settings[`${sensor.key}Min`]);
      const max = Number(settings[`${sensor.key}Max`]);

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return `${sensor.title}: Vui lòng nhập giá trị hợp lệ.`;
      }

      if (
        min < sensor.min ||
        max > sensor.max ||
        min >= max
      ) {
        return `${sensor.title}: Ngưỡng tối thiểu phải nhỏ hơn ngưỡng tối đa và nằm trong khoảng cho phép.`;
      }
    }

    return "";
  };

  const handleSave = () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setMessage("Đã lưu cấu hình trên trình duyệt.");
      setError("");
    } catch {
      setError("Không thể lưu cài đặt trong trình duyệt.");
      setMessage("");
    }
  };

  const handleReset = () => {
    setSettings({ ...defaultSettings });
    setMessage("Đã khôi phục giá trị mặc định trên biểu mẫu. Nhấn Lưu để áp dụng.");
    setError("");
  };

  return (
    <div className="smart-settings">
      <section className="settings-heading">
        <div>
          <span className="settings-eyebrow">
            TOMATO SMARTCARE / SETTINGS
          </span>

          <h2>Cài đặt hệ thống</h2>

          <p>
            Quản lý các tùy chọn giám sát và cảnh báo.
          </p>
        </div>

        <div className="settings-heading-icon">
          <Settings2 size={26} />
        </div>
      </section>

      <div className="settings-grid">
        <section className="settings-card settings-sensor-card">
          <div className="settings-card-heading">
            <div className="settings-section-icon">
              <Thermometer size={19} />
            </div>

            <div>
              <h3>Ngưỡng cảnh báo cảm biến</h3>
              <p>Điều chỉnh giới hạn tối thiểu và tối đa</p>
            </div>
          </div>

          <div className="settings-sensor-list">
            {sensorFields.map((sensor) => {
              const Icon = sensor.icon;

              return (
                <div
                  className="settings-sensor-row"
                  key={sensor.key}
                >
                  <div className="settings-sensor-name">
                    <Icon size={17} />
                    <span>{sensor.title}</span>
                  </div>

                  <div className="settings-sensor-inputs">
                    <label>
                      <span>Tối thiểu</span>
                      <input
                        type="number"
                        min={sensor.min}
                        max={sensor.max}
                        step={sensor.step}
                        value={
                          settings[`${sensor.key}Min`]
                        }
                        onChange={(event) =>
                          updateSetting(
                            `${sensor.key}Min`,
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <span className="settings-range-dash">
                      –
                    </span>

                    <label>
                      <span>Tối đa</span>
                      <input
                        type="number"
                        min={sensor.min}
                        max={sensor.max}
                        step={sensor.step}
                        value={
                          settings[`${sensor.key}Max`]
                        }
                        onChange={(event) =>
                          updateSetting(
                            `${sensor.key}Max`,
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <span className="settings-sensor-unit">
                      {sensor.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="settings-section-note">
            <Info size={15} />
            Các ngưỡng hiện chỉ được lưu ở frontend,
            chưa áp dụng vào hệ thống giám sát thực tế.
          </div>
        </section>

        <div className="settings-right-column">
          <section className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-section-icon">
                <Clock3 size={19} />
              </div>

              <div>
                <h3>Cấu hình giám sát</h3>
                <p>Tần suất cập nhật dữ liệu</p>
              </div>
            </div>

            <div className="settings-interval-row">
              <label htmlFor="settings-interval">
                Chu kỳ cập nhật
              </label>

              <select
                id="settings-interval"
                value={settings.updateInterval}
                onChange={(event) =>
                  updateSetting(
                    "updateInterval",
                    Number(event.target.value)
                  )
                }
              >
                <option value={5}>5 giây</option>
                <option value={10}>10 giây</option>
                <option value={30}>30 giây</option>
                <option value={60}>60 giây</option>
              </select>
            </div>
          </section>

          <section className="settings-card settings-notification-card">
            <div className="settings-card-heading">
              <div className="settings-section-icon">
                <Bell size={19} />
              </div>

              <div>
                <h3>Thông báo</h3>
                <p>Chọn loại thông báo muốn nhận</p>
              </div>
            </div>

            <ToggleRow
              icon={Thermometer}
              title="Cảnh báo môi trường"
              description="Nhiệt độ, độ ẩm và ánh sáng"
              checked={settings.environmentAlerts}
              onChange={(value) =>
                updateSetting("environmentAlerts", value)
              }
            />

            <ToggleRow
              icon={Camera}
              title="Thông báo AI"
              description="Kết quả nhận diện bệnh lá"
              checked={settings.aiAlerts}
              onChange={(value) =>
                updateSetting("aiAlerts", value)
              }
            />

            <ToggleRow
              icon={Bell}
              title="Hiển thị thông báo"
              description="Tùy chọn thông báo trong giao diện"
              checked={settings.showNotifications}
              onChange={(value) =>
                updateSetting("showNotifications", value)
              }
            />
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-section-icon">
                <Wifi size={19} />
              </div>

              <div>
                <h3>Trạng thái kết nối</h3>
                <p>Chế độ phát triển frontend</p>
              </div>
            </div>

            <div className="settings-connections">
              <div>
                <Wifi size={16} />
                <span>ESP32 / Cảm biến</span>
                <strong className="offline">Chưa kết nối</strong>
              </div>

              <div>
                <Server size={16} />
                <span>Backend Flask</span>
                <strong className="offline">Chưa kiểm tra</strong>
              </div>

              <div>
                <Camera size={16} />
                <span>API Chẩn đoán AI</span>
                <strong className="offline">Demo</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="settings-bottom-bar">
        <div className="settings-feedback">
          {error ? (
            <span className="settings-error" role="alert">
              <AlertCircle size={16} />
              {error}
            </span>
          ) : message ? (
            <span className="settings-success">
              <CheckCircle2 size={16} />
              {message}
            </span>
          ) : (
            <span>
              <Info size={15} />
              Thay đổi chỉ áp dụng cho cài đặt demo.
            </span>
          )}
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="settings-reset-btn"
            onClick={handleReset}
          >
            <RotateCcw size={16} />
            Mặc định
          </button>

          <button
            type="button"
            className="settings-save-btn"
            onClick={handleSave}
          >
            <Save size={16} />
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
