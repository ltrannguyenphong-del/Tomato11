import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import "./App.css";
import Diagnosis from "./pages/Diagnosis";
import Alerts from "./pages/Alerts";
import History from "./pages/History";
import MobileSnap from "./pages/MobileSnap";
import "./styles/engineering-theme.css";
import UserLocationMap from "./components/UserLocationMap";
import MetricChartModal from "./components/MetricChartModal";
import MockSensorPanel, {
  getMockSoilAround60,
  isMockSoil60Enabled,
} from "./components/MockSensorPanel";
import {
  appendPointToMonitoringHistory,
  generateMockReading,
  isMockSensorEnabled,
  seedInitialMockHistory,
} from "./utils/mockSensorEmulator";
import {
  Thermometer,
  Droplets,
  Sprout,
  Sun,
  Heart,
  Bell,
  ScanSearch,
  Leaf,
  Sparkles,
  ListChecks,
  ArrowUpRight,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import Monitoring from "./pages/Monitoring";

function resolveApiBaseUrl() {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:5000`;
  }
  return "http://127.0.0.1:5000";
}

const API_BASE_URL = resolveApiBaseUrl();
const POLL_INTERVAL_MS = 3000;
const DIAGNOSIS_STORAGE_KEY = "tomato_smartcare_diagnosis_state_v1";

const AI_CLASS_RULES = {
  Tomato_healthy: {
    viName: "Lá cà chua khỏe mạnh",
    defaultPriority: "Theo dõi",
    kind: "healthy",
    fastSpread: false,
  },
  Tomato_Late_blight: {
    viName: "Bệnh mốc sương / cháy lá muộn",
    defaultPriority: "Ưu tiên rất cao",
    kind: "disease",
    fastSpread: true,
  },
  Tomato_Early_blight: {
    viName: "Bệnh cháy lá sớm",
    defaultPriority: "Ưu tiên cao",
    kind: "disease",
    fastSpread: false,
  },
  Tomato_Leaf_Mold: {
    viName: "Bệnh mốc lá",
    defaultPriority: "Ưu tiên cao khi ẩm",
    kind: "disease",
    fastSpread: false,
  },
  Tomato_Septoria_leaf_spot: {
    viName: "Bệnh đốm lá Septoria",
    defaultPriority: "Ưu tiên cao khi ẩm",
    kind: "disease",
    fastSpread: false,
  },
  Tomato_Bacterial_spot: {
    viName: "Bệnh đốm vi khuẩn",
    defaultPriority: "Ưu tiên cao",
    kind: "disease",
    fastSpread: false,
  },
  Tomato__Target_Spot: {
    viName: "Bệnh đốm vòng mục tiêu",
    defaultPriority: "Ưu tiên cao khi có triệu chứng",
    kind: "disease",
    fastSpread: false,
  },
  Tomato_Spider_mites_Two_spotted_spider_mite: {
    viName: "Nhện đỏ hai chấm",
    defaultPriority: "Ưu tiên cao khi nóng/khô",
    kind: "pest",
    fastSpread: false,
  },
  Tomato__Tomato_YellowLeaf__Curl_Virus: {
    viName: "Bệnh xoăn vàng lá cà chua",
    defaultPriority: "Ưu tiên rất cao",
    kind: "virus",
    fastSpread: true,
  },
  Tomato__Tomato_mosaic_virus: {
    viName: "Bệnh khảm lá cà chua",
    defaultPriority: "Ưu tiên rất cao",
    kind: "virus",
    fastSpread: true,
  },
  Not_tomato: {
    viName: "Ảnh không phải lá cà chua",
    defaultPriority: "Không đánh giá bệnh",
    kind: "not_tomato",
    fastSpread: false,
  },
};

const pageNames = {
  overview: "Tổng quan",
  monitoring: "Giám sát IoT",
  diagnosis: "Chẩn đoán AI",
  alerts: "Cảnh báo",
  history: "Lịch sử",
};

const defaultSensorCards = [
  {
    key: "temperature",
    title: "Nhiệt độ",
    value: "—",
    unit: "°C",
    note: "Đang chờ dữ liệu cảm biến",
    icon: Thermometer,
    className: "temp-card",
    emoji: "🌤️",
  },
  {
    key: "humidity",
    title: "Độ ẩm KK",
    value: "—",
    unit: "%",
    note: "Đang chờ dữ liệu cảm biến",
    icon: Droplets,
    className: "air-card",
    emoji: "💧",
  },
  {
    key: "soil_moisture",
    title: "Độ ẩm đất",
    value: "—",
    unit: "%",
    note: "Đang chờ dữ liệu cảm biến",
    icon: Sprout,
    className: "soil-card",
    emoji: "🌱",
  },
  {
    key: "light_lux",
    title: "Ánh sáng",
    value: "—",
    unit: "lux",
    note: "Đang chờ dữ liệu cảm biến",
    icon: Sun,
    className: "light-card",
    emoji: "☀️",
  },
];

export function withSoilAround60(sensorData, dateObj = new Date()) {
  if (!sensorData || !isMockSoil60Enabled()) {
    return sensorData;
  }
  return {
    ...sensorData,
    soil_moisture: getMockSoilAround60(dateObj, true),
    soil_calibrated: true,
  };
}

function parseConfidenceNumber(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const cleaned = Number(val.replace("%", "").trim());
    if (Number.isFinite(cleaned)) return cleaned;
  }
  return null;
}

function formatAiTimestamp(rawTs) {
  if (!rawTs) return null;
  if (typeof rawTs === "number" && Number.isFinite(rawTs)) {
    const d = new Date(rawTs);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleString("vi-VN");
  }
  if (typeof rawTs === "string") {
    const trimmed = rawTs.trim();
    if (!trimmed) return null;
    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime()) && /[T:-]/.test(trimmed)) {
      return parsedDate.toLocaleString("vi-VN");
    }
    return trimmed;
  }
  return null;
}

function readLatestAiRecord() {
  try {
    const raw = localStorage.getItem(DIAGNOSIS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.result?.prediction) return null;

    const rawConf =
      parsed.result.confidence !== undefined
        ? parsed.result.confidence
        : parsed.confidence;

    const candidateTs =
      parsed.updatedAt ??
      parsed.timestamp ??
      parsed.savedAt ??
      parsed.time ??
      parsed.result?.updatedAt ??
      parsed.result?.timestamp ??
      null;

    let formattedTime = formatAiTimestamp(candidateTs);

    if (!formattedTime) {
      const nowIso = new Date().toISOString();
      formattedTime = formatAiTimestamp(nowIso);
      try {
        localStorage.setItem(
          DIAGNOSIS_STORAGE_KEY,
          JSON.stringify({ ...parsed, updatedAt: formattedTime })
        );
      } catch {
        // Bỏ qua nếu localStorage bị chặn ghi
      }
    }

    return {
      prediction: parsed.result.prediction,
      viName: parsed.result.adviceObj?.vi_name || "",
      updatedAt: formattedTime,
      confidence: parseConfidenceNumber(rawConf),
    };
  } catch {
    return null;
  }
}

// Ban ngày: 06:00 - 17:59 | Ban đêm / Tối: 18:00 - 05:59
function isDaytimeNow(now = new Date()) {
  const hour = now.getHours();
  return hour >= 6 && hour < 18;
}

function evaluateEnvironment(liveSensor, sensorConnected, now = new Date()) {
  if (!sensorConnected || !liveSensor) {
    return {
      connected: false,
      totalScore: null,
      levelLabel: "Đánh giá chưa đầy đủ",
      levelSummary: "Cảm biến mất kết nối hoặc chưa có dữ liệu mới nhất.",
      sensors: [],
      highRiskSensors: [],
      worstSensor: null,
      humidityOver90: false,
      humidityOver80: false,
      hotOrDry: false,
    };
  }

  const temp = Number(liveSensor.temperature);
  const hum = Number(liveSensor.humidity);
  const soil = Number(liveSensor.soil_moisture);
  const soilAdc = Number(liveSensor.soil_adc ?? 0);
  const light = Number(liveSensor.light_lux);
  const isSoilCalibrated = liveSensor.soil_calibrated !== false;
  const daytime = isDaytimeNow(now);

  let tempScore = 0;
  let tempStatus = "Bình thường";
  let tempCondition = "Trong ngưỡng 18–30°C";
  if (Number.isFinite(temp)) {
    const tempRounded = Number(temp.toFixed(1));
    if (tempRounded < 15 || temp > 35) {
      tempScore = 2;
      tempStatus = "Nguy cơ cao";
      tempCondition =
        tempRounded < 15 ? "Rét đậm (< 15°C)" : "Nắng nóng gay gắt (> 35°C)";
    } else if (
      (tempRounded >= 15 && tempRounded <= 17.9) ||
      (temp > 30 && temp <= 35)
    ) {
      tempScore = 1;
      tempStatus = "Cảnh báo";
      tempCondition =
        tempRounded < 18 ? "Hơi lạnh (15–17,9°C)" : "Nóng (> 30–35°C)";
    }
  }

  let humScore = 0;
  let humStatus = "Bình thường";
  let humCondition = "Trong ngưỡng 50–80% RH";
  if (Number.isFinite(hum)) {
    if (hum < 40 || hum > 90) {
      humScore = 2;
      humStatus = "Nguy cơ cao";
      humCondition =
        hum < 40
          ? "Không khí quá khô (< 40% RH)"
          : "Độ ẩm rất cao (> 90% RH) — ưu tiên kiểm tra bệnh lá nếu kéo dài";
    } else if ((hum >= 40 && hum <= 49) || (hum > 80 && hum <= 90)) {
      humScore = 1;
      humStatus = "Cảnh báo";
      humCondition = hum < 50 ? "Hơi khô (40–49% RH)" : "Ẩm cao (> 80–90% RH)";
    }
  }

  let soilScore = 0;
  let soilStatus = "Bình thường";
  let soilCondition = "Trong ngưỡng 40–70%";
  let soilDisplay = Number.isFinite(soil) ? `${soil.toFixed(1)}%` : "—";

  if (!isSoilCalibrated) {
    soilScore = 0;
    soilStatus = "Chưa hiệu chuẩn";
    soilCondition = `ADC: ${Number.isFinite(soilAdc) ? Math.round(soilAdc) : 0} (chưa dùng ngưỡng %)`;
    soilDisplay = `ADC ${Number.isFinite(soilAdc) ? Math.round(soilAdc) : 0}`;
  } else if (Number.isFinite(soil)) {
    if (soil < 20 || soil > 80) {
      soilScore = 2;
      soilStatus = "Nguy cơ cao";
      soilCondition = soil < 20 ? "Đất quá khô (< 20%)" : "Đất quá ướt / úng (> 80%)";
    } else if ((soil >= 20 && soil <= 39) || (soil > 70 && soil <= 80)) {
      soilScore = 1;
      soilStatus = "Cảnh báo";
      soilCondition = soil < 40 ? "Đất hơi khô (20–39%)" : "Đất hơi ẩm (> 70–80%)";
    }
  }

  let lightScore = 0;
  let lightStatus = "Bình thường";
  let lightCondition = daytime
    ? "Trong ngưỡng ban ngày 10.000–30.000 lux"
    : "Ban đêm — ánh sáng thấp là bình thường";

  if (Number.isFinite(light)) {
    if (!daytime) {
      if (light > 40000) {
        lightScore = 2;
        lightStatus = "Nguy cơ cao";
        lightCondition = "Ban đêm nhưng ánh sáng quá mạnh (> 40.000 lux)";
      } else if (light > 30000) {
        lightScore = 1;
        lightStatus = "Cảnh báo";
        lightCondition = "Ban đêm nhưng ánh sáng mạnh (> 30.000 lux)";
      } else {
        lightScore = 0;
        lightStatus = "Bình thường";
        lightCondition = "Ban đêm — ánh sáng thấp là bình thường";
      }
    } else {
      if (light < 5000 || light > 40000) {
        lightScore = 2;
        lightStatus = "Nguy cơ cao";
        lightCondition =
          light < 5000
            ? "Thiếu sáng ban ngày (< 5.000 lux)"
            : "Ánh sáng quá gắt ban ngày (> 40.000 lux)";
      } else if (
        (light >= 5000 && light <= 9999) ||
        (light > 30000 && light <= 40000)
      ) {
        lightScore = 1;
        lightStatus = "Cảnh báo";
        lightCondition =
          light < 10000
            ? "Ánh sáng yếu ban ngày (5.000–9.999 lux)"
            : "Ánh sáng mạnh ban ngày (> 30.000–40.000 lux)";
      }
    }
  }

  const sensors = [
    {
      key: "temperature",
      label: "Nhiệt độ không khí",
      valueText: Number.isFinite(temp) ? `${temp.toFixed(1)}°C` : "—",
      score: tempScore,
      status: tempStatus,
      condition: tempCondition,
      raw: temp,
    },
    {
      key: "humidity",
      label: "Độ ẩm không khí",
      valueText: Number.isFinite(hum) ? `${hum.toFixed(1)}% RH` : "—",
      score: humScore,
      status: humStatus,
      condition: humCondition,
      raw: hum,
    },
    {
      key: "soil",
      label: isSoilCalibrated ? "Độ ẩm đất" : "Độ ẩm đất (chưa hiệu chuẩn)",
      valueText: soilDisplay,
      score: soilScore,
      status: soilStatus,
      condition: soilCondition,
      raw: soil,
      calibrated: isSoilCalibrated,
    },
    {
      key: "light",
      label: daytime ? "Ánh sáng ban ngày" : "Ánh sáng ban đêm",
      valueText: Number.isFinite(light)
        ? `${Math.round(light).toLocaleString("vi-VN")} lux`
        : "—",
      score: lightScore,
      status: lightStatus,
      condition: lightCondition,
      raw: light,
    },
  ];

  const totalScore = tempScore + humScore + soilScore + lightScore;
  const highRiskSensors = sensors.filter((s) => s.score === 2);
  const sortedByRisk = [...sensors].sort((a, b) => b.score - a.score);
  const worstSensor = sortedByRisk[0]?.score > 0 ? sortedByRisk[0] : null;

  let levelLabel = "Bình thường";
  let levelSummary = "Môi trường tương đối phù hợp theo các ngưỡng tham chiếu.";
  if (totalScore >= 6) {
    levelLabel = "Rủi ro rất cao";
    levelSummary = "Nhiều thông số ở mức nguy cơ cao; cần kiểm tra vườn sớm.";
  } else if (totalScore >= 4) {
    levelLabel = "Rủi ro cao";
    levelSummary = "Nhiều thông số môi trường đang bất lợi.";
  } else if (totalScore >= 2) {
    levelLabel = "Cần chú ý";
    levelSummary = "Có một hoặc nhiều điều kiện bất lợi.";
  }

  return {
    connected: true,
    totalScore,
    levelLabel,
    levelSummary,
    sensors,
    highRiskSensors,
    worstSensor,
    humidityOver90: Number.isFinite(hum) && hum > 90,
    humidityOver80: Number.isFinite(hum) && hum > 80,
    hotOrDry:
      (Number.isFinite(temp) && temp > 30) || (Number.isFinite(hum) && hum < 40),
  };
}

function evaluateAiState(latestAi, envEval) {
  if (!latestAi || !latestAi.prediction) {
    return {
      hasAi: false,
      prediction: "",
      viName: "",
      updatedAt: "Chưa ghi nhận",
      confidenceNorm: null,
      confidenceTier: "none",
      statusText: "Chưa có kết quả chẩn đoán AI",
      priorityLabel: "Chưa đánh giá",
      actionText: "Chụp hoặc tải ảnh lá cà chua tại trang Chẩn đoán AI để kiểm tra.",
      isNotTomato: false,
      isLowConfidence: false,
      isHealthy: false,
      isLateBlight: false,
      isDiseaseOrPest: false,
    };
  }

  const rawPred = latestAi.prediction;
  const isNotTomato =
    rawPred === "Not_tomato" || rawPred === "Không phải lá cà chua";
  const isUncertainLabel = rawPred === "Không chắc, cần chụp lại";

  const rule =
    AI_CLASS_RULES[isNotTomato ? "Not_tomato" : rawPred] || {
      viName: latestAi.viName || rawPred,
      defaultPriority: "Cần xác minh",
      kind: "disease",
      fastSpread: false,
    };

  let confidenceNorm = null;
  if (
    typeof latestAi.confidence === "number" &&
    Number.isFinite(latestAi.confidence)
  ) {
    confidenceNorm =
      latestAi.confidence > 1 ? latestAi.confidence / 100 : latestAi.confidence;
  }

  let confidenceTier = "unknown";
  if (isUncertainLabel || (confidenceNorm !== null && confidenceNorm < 0.6)) {
    confidenceTier = "low";
  } else if (confidenceNorm !== null && confidenceNorm < 0.8) {
    confidenceTier = "medium";
  } else if (confidenceNorm !== null && confidenceNorm >= 0.8) {
    confidenceTier = "high";
  } else {
    confidenceTier = "high";
  }

  const isLowConfidence = confidenceTier === "low";
  const isHealthy = !isNotTomato && !isLowConfidence && rule.kind === "healthy";
  const isLateBlight = !isLowConfidence && rawPred === "Tomato_Late_blight";
  const isDiseaseOrPest =
    !isNotTomato &&
    !isLowConfidence &&
    (rule.kind === "disease" || rule.kind === "pest" || rule.kind === "virus");

  let statusText = `${rule.viName} (${rawPred})`;
  let priorityLabel = rule.defaultPriority;
  let actionText = "";

  if (isNotTomato) {
    statusText = `Ảnh không phải lá cà chua (${rawPred})`;
    priorityLabel = "Không đánh giá bệnh";
    actionText =
      "Yêu cầu chụp lại một chiếc lá cà chua rõ nét; hệ thống vẫn đánh giá môi trường bằng cảm biến nếu dữ liệu hợp lệ.";
  } else if (isLowConfidence) {
    statusText = `Kết quả chưa đủ tin cậy (${rule.viName})`;
    priorityLabel = "Cần xác minh";
    actionText =
      "Kết quả chưa đủ tin cậy (< 0,60): không đưa ra khuyến nghị điều trị chuyên biệt dựa riêng vào lớp dự đoán; vui lòng chụp lại ảnh rõ nét hơn.";
  } else if (confidenceTier === "medium") {
    statusText = `Có dấu hiệu nghi ngờ: ${rule.viName} (${rawPred})`;
    priorityLabel = "Nghi ngờ — cần kiểm tra trực tiếp";
    actionText =
      "Độ tin cậy ở mức 0,60 đến dưới 0,80: nên chụp lại ảnh rõ hơn và kiểm tra trực tiếp triệu chứng trên lá thật.";
  } else if (isHealthy) {
    statusText = `${rule.viName} (${rawPred})`;
    priorityLabel = "Theo dõi";
    actionText =
      envEval.connected && envEval.totalScore >= 2
        ? "AI chưa phát hiện dấu hiệu bệnh, nhưng môi trường đang bất lợi — ưu tiên điều chỉnh thông số môi trường và tiếp tục giám sát."
        : "Chưa phát hiện dấu hiệu thuộc các lớp bệnh đã huấn luyện; tiếp tục duy trì giám sát định kỳ (không khẳng định cây khỏe hoàn toàn).";
  } else {
    if (rawPred === "Tomato_Late_blight") {
      priorityLabel = "Ưu tiên rất cao";
      actionText = envEval.humidityOver80
        ? "Độ ẩm không khí đang trên 80%: ưu tiên xác minh sớm vết bệnh lan nhanh, hạn chế phát tán vật liệu nghi nhiễm bệnh."
        : "Kiểm tra trực tiếp các vết bệnh lan nhanh và mặt dưới lá; hạn chế làm phát tán vật liệu nghi nhiễm bệnh.";
    } else if (rawPred === "Tomato_Leaf_Mold") {
      priorityLabel = envEval.humidityOver80
        ? "Ưu tiên cao (đang ẩm > 80%)"
        : "Ưu tiên cao khi ẩm";
      actionText = envEval.humidityOver80
        ? "Độ ẩm không khí trên 80% tạo điều kiện thuận lợi cho mốc lá: ưu tiên tăng thông gió, kiểm tra mặt dưới lá và giảm ẩm đọng kéo dài."
        : "Kiểm tra mặt dưới lá (lớp mốc màu ôliu/nâu), duy trì thông gió và tránh tưới làm ướt lá buổi tối.";
    } else if (rawPred === "Tomato_Septoria_leaf_spot") {
      priorityLabel = envEval.humidityOver80
        ? "Ưu tiên cao (đang ẩm > 80%)"
        : "Ưu tiên cao khi ẩm";
      actionText =
        "Kiểm tra đốm lá nhỏ tâm xám viền sẫm, hạn chế nước bắn từ đất, phủ gốc và loại bỏ lá nhiễm bệnh nặng.";
    } else if (rawPred === "Tomato_Early_blight") {
      priorityLabel = "Ưu tiên cao";
      actionText =
        "Kiểm tra đốm nâu vòng đồng tâm ở lá già phía dưới, loại bỏ lá bệnh nặng, tưới vào gốc và cải thiện thông thoáng.";
    } else if (rawPred === "Tomato_Bacterial_spot") {
      priorityLabel = "Ưu tiên cao";
      actionText =
        "Hạn chế nước bắn giữa cây, vệ sinh dụng cụ và xác minh dấu hiệu đốm vi khuẩn; không mặc định sử dụng thuốc trị nấm.";
    } else if (rawPred === "Tomato__Target_Spot") {
      priorityLabel = "Ưu tiên cao khi có triệu chứng";
      actionText =
        "Kiểm tra đốm nâu vòng đồng tâm và xác minh trên cây thật vì triệu chứng dễ giống cháy lá sớm.";
    } else if (rawPred === "Tomato_Spider_mites_Two_spotted_spider_mite") {
      priorityLabel = envEval.hotOrDry
        ? "Ưu tiên cao (đang nóng/khô)"
        : "Ưu tiên cao khi nóng/khô";
      actionText = envEval.hotOrDry
        ? "Điều kiện nóng (> 30°C) hoặc khô (< 40% RH) làm tăng mức cần kiểm tra: soi mặt dưới lá tìm chấm vàng, nhện đỏ và tơ mảnh (không kết luận chỉ từ cảm biến)."
        : "Kiểm tra mặt dưới lá tìm nhện đỏ, trứng và tơ mảnh; xử lý theo nhóm nhện hại.";
    } else if (
      rawPred === "Tomato__Tomato_YellowLeaf__Curl_Virus" ||
      rawPred === "Tomato__Tomato_mosaic_virus"
    ) {
      priorityLabel = "Ưu tiên rất cao";
      actionText =
        rawPred === "Tomato__Tomato_YellowLeaf__Curl_Virus"
          ? "Kiểm tra lá non xoăn vàng và bọ phấn trắng; hạn chế lây lan, không dùng thuốc diệt nấm để chữa virus."
          : "Kiểm tra hiện tượng loang màu xanh đậm/nhạt và biến dạng lá; vệ sinh tay/dụng cụ, hạn chế tiếp xúc lây lan (không dùng thuốc diệt nấm).";
    }
  }

  return {
    hasAi: true,
    prediction: rawPred,
    viName: rule.viName,
    updatedAt: latestAi.updatedAt || "Chưa ghi nhận",
    confidenceNorm,
    confidenceTier,
    statusText,
    priorityLabel,
    actionText,
    isNotTomato,
    isLowConfidence,
    isHealthy,
    isLateBlight,
    isDiseaseOrPest,
    kind: rule.kind,
  };
}

function buildOverallDecision(envEval, aiEval) {
  let overallLevel = "Đánh giá chưa đầy đủ";
  let overallTone = "warn";
  let overallSummary = "";

  if (!envEval.connected) {
    overallLevel = "Đánh giá chưa đầy đủ";
    overallTone = "warn";
    overallSummary =
      "Cảm biến đang mất kết nối hoặc chưa có dữ liệu mới nhất; không suy diễn từ giá trị cũ.";
  } else if (!aiEval.hasAi) {
    overallLevel =
      envEval.totalScore >= 4 ? "Rủi ro môi trường cao" : "Chưa có dữ liệu AI";
    overallTone = envEval.totalScore >= 4 ? "danger" : "warn";
    overallSummary = `Điểm môi trường E = ${envEval.totalScore}/8 (${envEval.levelLabel}). Chưa có kết quả chẩn đoán lá từ AI để kết hợp.`;
  } else if (aiEval.isNotTomato) {
    overallLevel = "Chưa đánh giá được tình trạng lá";
    overallTone = "warn";
    overallSummary = `Ảnh gần nhất không phải lá cà chua; hệ thống chỉ đánh giá môi trường (E = ${envEval.totalScore}/8 — ${envEval.levelLabel}) và không đưa khuyến nghị điều trị bệnh lá.`;
  } else if (aiEval.isLowConfidence) {
    overallLevel = "Chưa đủ dữ liệu kết luận bệnh";
    overallTone = "warn";
    overallSummary = `Kết quả AI chưa đủ tin cậy (< 0,60); vui lòng chụp lại ảnh lá. Đánh giá môi trường hiện tại: E = ${envEval.totalScore}/8 (${envEval.levelLabel}).`;
  } else if (aiEval.isLateBlight) {
    overallLevel = "Ưu tiên xác minh ngay";
    overallTone = "danger";
    overallSummary = `AI nhận diện ${aiEval.viName} (cần xác minh triệu chứng thực tế bất kể điểm môi trường E = ${envEval.totalScore}/8). Kiểm tra sớm và hạn chế phát tán vật liệu nghi bệnh.`;
  } else if (aiEval.isDiseaseOrPest) {
    if (envEval.totalScore >= 4) {
      overallLevel = "Ưu tiên cao";
      overallTone = "danger";
      overallSummary = `AI phát hiện dấu hiệu ${aiEval.viName} kết hợp môi trường bất lợi cao (E = ${envEval.totalScore}/8). Cần vừa kiểm tra/xử lý lá nghi bệnh, vừa khắc phục điều kiện môi trường.`;
    } else {
      overallLevel = "Ưu tiên kiểm tra bệnh";
      overallTone = "warn";
      overallSummary = `AI phát hiện dấu hiệu ${aiEval.viName} trong khi điểm môi trường E = ${envEval.totalScore}/8 (${envEval.levelLabel}). Cần kiểm tra triệu chứng tương ứng và vệ sinh vườn.`;
    }
  } else if (aiEval.isHealthy) {
    if (envEval.totalScore <= 1) {
      overallLevel = "Bình thường";
      overallTone = "ok";
      overallSummary = `Môi trường ổn định (E = ${envEval.totalScore}/8) và AI chưa phát hiện dấu hiệu bệnh trên lá. Tiếp tục duy trì giám sát định kỳ.`;
    } else if (envEval.totalScore <= 3) {
      overallLevel = "Cần chú ý";
      overallTone = "warn";
      overallSummary = `AI chưa phát hiện bệnh trên lá, nhưng điểm môi trường E = ${envEval.totalScore}/8 (${envEval.levelLabel}). Cần điều chỉnh thông số bất lợi nhất.`;
    } else {
      overallLevel = "Rủi ro môi trường cao";
      overallTone = "danger";
      overallSummary = `AI chưa phát hiện bệnh trên lá nhưng môi trường đang rủi ro cao (E = ${envEval.totalScore}/8). Ưu tiên điều chỉnh nhiệt độ, tưới hoặc thông gió; không kết luận cây đã mắc bệnh.`;
    }
  }

  const actions = [];

  if (aiEval.hasAi && aiEval.isDiseaseOrPest) {
    actions.push({
      title: `Xác minh ${aiEval.viName} trên cây thật`,
      reason: aiEval.actionText,
      targetPage: "diagnosis",
      targetLabel: "Chẩn đoán AI",
    });
  } else if (aiEval.hasAi && (aiEval.isNotTomato || aiEval.isLowConfidence)) {
    actions.push({
      title: "Chụp lại ảnh lá cà chua rõ nét",
      reason: aiEval.actionText,
      targetPage: "diagnosis",
      targetLabel: "Chẩn đoán AI",
    });
  }

  if (!envEval.connected) {
    actions.push({
      title: "Kiểm tra kết nối cảm biến ESP32 / backend",
      reason: "Chưa nhận được số đo thực tế mới nhất để tính điểm môi trường E.",
      targetPage: "monitoring",
      targetLabel: "Giám sát IoT",
    });
  } else if (envEval.worstSensor) {
    actions.push({
      title: `Khắc phục thông số ${envEval.worstSensor.label}`,
      reason: `Đang ở mức ${envEval.worstSensor.status} (${envEval.worstSensor.valueText} — ${envEval.worstSensor.condition}).`,
      targetPage: "monitoring",
      targetLabel: "Giám sát IoT",
    });
  }

  if (envEval.connected && envEval.humidityOver90 && actions.length < 3) {
    actions.push({
      title: "Ưu tiên kiểm tra bệnh lá khi ẩm > 90%",
      reason:
        "Độ ẩm không khí vượt 90% RH; nếu kéo dài kết hợp nhiệt độ phù hợp cần ưu tiên kiểm tra lá và giảm ẩm đọng.",
      targetPage: "monitoring",
      targetLabel: "Giám sát IoT",
    });
  }

  if (actions.length < 3) {
    actions.push({
      title: "Theo dõi xu hướng đo & kiểm tra định kỳ",
      reason:
        "Quan sát mặt dưới lá, độ ẩm giá thể và biểu đồ biến thiên để phát hiện sớm thay đổi bất thường.",
      targetPage: aiEval.hasAi ? "monitoring" : "diagnosis",
      targetLabel: aiEval.hasAi ? "Giám sát IoT" : "Chẩn đoán AI",
    });
  }

  return {
    overallLevel,
    overallTone,
    overallSummary,
    actions: actions.slice(0, 3),
  };
}

function CuteSensorCard({ item, onSelect }) {
  const Icon = item.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`cute-sensor-card ${item.className}`}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect?.(item.key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(item.key);
        }
      }}
      title={`Nhấn để xem đồ thị ${item.title}`}
    >
      <div className="cute-sensor-top">
        <div className="cute-icon-wrap">
          <Icon size={22} />
        </div>
        <span className="cute-emoji">{item.emoji}</span>
      </div>

      <p className="cute-card-title">{item.title}</p>

      <div className="cute-card-value">
        <strong>{item.value}</strong>
        <span>{item.unit}</span>
      </div>

      <p className="cute-card-note">{item.note}</p>
    </div>
  );
}

function OverviewPage({
  liveSensor,
  sensorConnected,
  latestAi,
  now,
  onNavigate,
  onSelectMetric,
  onAppliedMock,
}) {
  const tempVal = Number(liveSensor?.temperature ?? 0);
  const humVal = Number(liveSensor?.humidity ?? 0);
  const soilVal = Number(liveSensor?.soil_moisture ?? 0);
  const lightVal = Number(liveSensor?.light_lux ?? 0);
  const isSoilCalibrated = liveSensor?.soil_calibrated !== false;

  const envEval = evaluateEnvironment(liveSensor, sensorConnected, now);
  const aiEval = evaluateAiState(latestAi, envEval);
  const decision = buildOverallDecision(envEval, aiEval);

  const cards = [
    {
      ...defaultSensorCards[0],
      value: sensorConnected ? tempVal.toFixed(1) : "—",
      note: sensorConnected
        ? `${envEval.sensors[0]?.status} · ${envEval.sensors[0]?.condition}`
        : "Chưa có dữ liệu cảm biến",
    },
    {
      ...defaultSensorCards[1],
      value: sensorConnected ? humVal.toFixed(1) : "—",
      note: sensorConnected
        ? `${envEval.sensors[1]?.status} · ${envEval.sensors[1]?.condition}`
        : "Chưa có dữ liệu cảm biến",
    },
    {
      ...defaultSensorCards[2],
      value: sensorConnected
        ? isSoilCalibrated
          ? soilVal.toFixed(1)
          : `${Math.round(Number(liveSensor?.soil_adc ?? 0))}`
        : "—",
      unit: sensorConnected && !isSoilCalibrated ? "ADC" : "%",
      note: sensorConnected
        ? `${envEval.sensors[2]?.status} · ${envEval.sensors[2]?.condition}`
        : "Chưa có dữ liệu cảm biến",
    },
    {
      ...defaultSensorCards[3],
      value: sensorConnected ? Math.round(lightVal).toString() : "—",
      note: sensorConnected
        ? `${envEval.sensors[3]?.status} · ${envEval.sensors[3]?.condition}`
        : "Chưa có dữ liệu cảm biến",
    },
  ];

  const badgeColors = {
    ok: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
    warn: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
    danger: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
  };
  const toneStyle = badgeColors[decision.overallTone] || badgeColors.warn;

  return (
    <div
      className="cute-page"
      style={{ display: "flex", flexDirection: "column", gap: "20px" }}
    >
      <MockSensorPanel onApplied={onAppliedMock} />

      <section className="cute-section">
        <div className="cute-sensor-grid">
          {cards.map((item) => (
            <CuteSensorCard
              key={item.key}
              item={item}
              onSelect={onSelectMetric}
            />
          ))}
        </div>
      </section>

      <section
        className="cute-bottom-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            height: "100%",
          }}
        >
          <div
            className="cute-panel"
            style={{
              padding: "18px 20px",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <UserLocationMap />
          </div>

          <div
            className="cute-panel status-panel"
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            <div className="panel-title-row">
              <div className="panel-icon yellow">
                <Bell size={18} />
              </div>
              <div>
                <h4>Trạng thái hệ thống</h4>
                <p>Kết nối thời gian thực</p>
              </div>
            </div>

            <div className="status-box-list" style={{ flex: 1 }}>
              <div className="status-box">
                <span>Frontend</span>
                <strong className="ok">Đang chạy</strong>
              </div>

              <div className="status-box">
                <span>Backend Flask</span>
                <strong className={liveSensor ? "ok" : "wait"}>
                  {liveSensor ? "Sẵn sàng" : "Đang kiểm tra"}
                </strong>
              </div>

              <div className="status-box">
                <span>ESP32 / cảm biến</span>
                <strong className={sensorConnected ? "ok" : "wait"}>
                  {sensorConnected ? "Đang kết nối" : "Chưa kết nối"}
                </strong>
              </div>

              <div className="status-box">
                <span>AI nhận diện lá</span>
                <strong className="ok">Sẵn sàng</strong>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            height: "100%",
          }}
        >
          <div
            className="cute-panel"
            style={{
              padding: "18px 20px",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
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
              <div className="panel-title-row" style={{ marginBottom: 0 }}>
                <div className="panel-icon pink">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4>Đánh giá tình trạng vườn</h4>
                </div>
              </div>

              <span
                style={{
                  padding: "5px 12px",
                  borderRadius: "999px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  background: toneStyle.bg,
                  color: toneStyle.color,
                  border: `1px solid ${toneStyle.border}`,
                }}
              >
                {decision.overallLevel}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.5 }}>
              {decision.overallSummary}
            </p>

            <div
              style={{
                paddingTop: "12px",
                borderTop: "1px solid #eef2f7",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <strong>Môi trường cảm biến</strong>
                {envEval.connected && (
                  <span>
                    <strong>E = {envEval.totalScore}/8</strong> ·{" "}
                    {envEval.levelLabel}
                  </span>
                )}
              </div>

              {!envEval.connected ? (
                <p style={{ margin: 0, opacity: 0.8 }}>
                  Chưa có dữ liệu cảm biến mới nhất từ backend để tính điểm môi trường.
                </p>
              ) : (
                <>
                  <p style={{ margin: 0, opacity: 0.88 }}>
                    {envEval.levelSummary}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(185px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {envEval.sensors.map((s) => (
                      <div
                        key={s.key}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "10px",
                          background:
                            s.score === 2
                              ? "#fef2f2"
                              : s.score === 1
                              ? "#fffbeb"
                              : "#f8fafc",
                          border: `1px solid ${
                            s.score === 2
                              ? "#fecaca"
                              : s.score === 1
                              ? "#fde68a"
                              : "#e2e8f0"
                          }`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "6px",
                          }}
                        >
                          <strong>{s.label}</strong>
                          <span>{s.score}đ</span>
                        </div>
                        <div style={{ marginTop: "2px" }}>
                          <strong>{s.valueText}</strong> · {s.status}
                        </div>
                      </div>
                    ))}
                  </div>

                  {envEval.highRiskSensors.length > 0 && (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "10px",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#991b1b",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <AlertTriangle
                        size={15}
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      />
                      <span>
                        <strong>Cảnh báo mức nguy cơ cao: </strong>
                        {envEval.highRiskSensors
                          .map(
                            (s) =>
                              `${s.label} (${s.valueText} — ${s.condition})`
                          )
                          .join("; ")}
                        .
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              style={{
                paddingTop: "12px",
                borderTop: "1px solid #eef2f7",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "13.5px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Sparkles size={15} />
                  <strong>Tình trạng lá theo AI</strong>
                </div>
                {aiEval.hasAi && (
                  <span style={{ fontSize: "12.5px", fontWeight: 600 }}>
                    {aiEval.priorityLabel}
                  </span>
                )}
              </div>

              {!aiEval.hasAi ? (
                <div style={{ opacity: 0.85 }}>
                  <p style={{ margin: "0 0 8px" }}>{aiEval.actionText}</p>
                  <button
                    type="button"
                    onClick={() => onNavigate("diagnosis")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}
                  >
                    <span>Đi tới Chẩn đoán AI</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <strong>Nhận diện: </strong>
                    <span>{aiEval.statusText}</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      opacity: 0.85,
                      fontSize: "12.5px",
                    }}
                  >
                    <span>
                      <strong>Thời gian: </strong>
                      {aiEval.updatedAt}
                    </span>
                    {aiEval.confidenceNorm !== null && (
                      <span>
                        <strong>Confidence: </strong>
                        {(aiEval.confidenceNorm * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <p style={{ margin: "2px 0 0", lineHeight: 1.5 }}>
                    {aiEval.actionText}
                  </p>
                </>
              )}
            </div>
          </div>

          <div
            className="cute-panel recommendation-panel"
            style={{
              flex: 1,
              padding: "18px 20px",
              borderRadius: "20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="panel-title-row" style={{ marginBottom: "10px" }}>
              <div className="panel-icon pink">
                <ListChecks size={18} />
              </div>
              <div>
                <h4>Khuyến nghị ưu tiên</h4>
                <p>Tối đa 3 hành động xếp theo mức độ ưu tiên</p>
              </div>
            </div>

            <div className="note-list" style={{ flex: 1 }}>
              {decision.actions.map((act, idx) => (
                <div className="note-card" key={idx}>
                  <span>{idx + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>{act.title}</strong>
                      <button
                        type="button"
                        onClick={() => onNavigate(act.targetPage)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        <span>{act.targetLabel}</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                    <p style={{ marginTop: "4px" }}>{act.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlaceholderPage({ title }) {
  const icons = {
    monitoring: <Droplets size={22} />,
    diagnosis: <ScanSearch size={22} />,
    alerts: <Bell size={22} />,
    history: <Leaf size={22} />,
    settings: <Heart size={22} />,
  };

  return (
    <div className="placeholder-cute-page">
      <div className="placeholder-sticker">
        {icons[title?.toLowerCase()] || "🍅"}
      </div>

      <div className="placeholder-card">
        <div className="placeholder-emoji">🍅</div>
        <h2>{title}</h2>
        <p>
          Trang này mình sẽ làm tiếp theo với cùng concept pastel cute, nhưng mỗi
          trang sẽ có một màu và cảm giác riêng.
        </p>

        <div className="placeholder-tags">
          <span>cute</span>
          <span>pastel</span>
          <span>tomato theme</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const isMobileSnapRoute =
    typeof window !== "undefined" &&
    window.location.pathname === "/mobile-snap";

  const [activePage, setActivePage] = useState("overview");
  const [liveSensor, setLiveSensor] = useState(null);
  const [sensorConnected, setSensorConnected] = useState(false);
  const [latestAi, setLatestAi] = useState(() => readLatestAiRecord());
  const [now, setNow] = useState(() => new Date());
  const [selectedMetric, setSelectedMetric] = useState(null);

  useEffect(() => {
    setLatestAi(readLatestAiRecord());
  }, [activePage]);

  useEffect(() => {
    const syncAiFromStorage = (event) => {
      if (!event.key || event.key === DIAGNOSIS_STORAGE_KEY) {
        setLatestAi(readLatestAiRecord());
      }
    };
    window.addEventListener("storage", syncAiFromStorage);
    return () => window.removeEventListener("storage", syncAiFromStorage);
  }, []);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const fetchSensors = useCallback(async () => {
    if (isMobileSnapRoute) return;
    const nowObj = new Date();

    if (isMockSensorEnabled()) {
      seedInitialMockHistory(12, 10, nowObj);
      const mockData = withSoilAround60(generateMockReading(nowObj), nowObj);
      setLiveSensor(mockData);
      setSensorConnected(true);
      appendPointToMonitoringHistory(mockData, nowObj);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/sensors`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      const hasRealData =
        data &&
        data.status !== "No Data" &&
        !data.error &&
        (Number(data.temperature) !== 0 ||
          Number(data.humidity) !== 0 ||
          Number(data.soil_moisture) !== 0 ||
          Number(data.soil_adc) !== 0 ||
          Number(data.light_lux) !== 0);

      if (hasRealData) {
        const mergedRealData = withSoilAround60(data, nowObj);
        setLiveSensor(mergedRealData);
        setSensorConnected(true);
        appendPointToMonitoringHistory(mergedRealData, nowObj);
        return;
      }

      // Chưa có dữ liệu thật: dùng dữ liệu giả lập để không bị trắng trang
      seedInitialMockHistory(12, 10, nowObj);
      const fallbackMock = withSoilAround60(generateMockReading(nowObj), nowObj);
      setLiveSensor(fallbackMock);
      setSensorConnected(false);
      appendPointToMonitoringHistory(fallbackMock, nowObj);
    } catch {
      // Lỗi kết nối / backend chưa chạy: dùng dữ liệu giả lập để không bị trắng trang
      seedInitialMockHistory(12, 10, nowObj);
      const fallbackMock = withSoilAround60(generateMockReading(nowObj), nowObj);
      setLiveSensor(fallbackMock);
      setSensorConnected(false);
      appendPointToMonitoringHistory(fallbackMock, nowObj);
    }
  }, [isMobileSnapRoute]);

  useEffect(() => {
    if (isMobileSnapRoute) return;
    fetchSensors();
    const timer = setInterval(fetchSensors, POLL_INTERVAL_MS);

    const onMockUpdated = () => {
      fetchSensors();
    };
    window.addEventListener("tomato-mock-sensor-updated", onMockUpdated);

    return () => {
      clearInterval(timer);
      window.removeEventListener("tomato-mock-sensor-updated", onMockUpdated);
    };
  }, [fetchSensors, isMobileSnapRoute]);

  if (isMobileSnapRoute) {
    return <MobileSnap />;
  }

  return (
    <div className={`app-shell cute-theme page-${activePage}`}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="app-workspace">
        <Header activePage={activePage} />

        <main className="page-content">
          {activePage === "overview" ? (
            <OverviewPage
              liveSensor={liveSensor}
              sensorConnected={sensorConnected}
              latestAi={latestAi}
              now={now}
              onNavigate={setActivePage}
              onSelectMetric={(metricKey) => setSelectedMetric(metricKey)}
              onAppliedMock={(reading) => {
                const nowObj = new Date();
                if (isMockSensorEnabled()) {
                  setLiveSensor(withSoilAround60(reading, nowObj));
                  setSensorConnected(true);
                } else {
                  setLiveSensor((prev) =>
                    withSoilAround60(prev || reading, nowObj)
                  );
                }
              }}
            />
          ) : activePage === "monitoring" ? (
            <Monitoring />
          ) : activePage === "diagnosis" ? (
            <Diagnosis />
          ) : activePage === "alerts" ? (
            <Alerts />
          ) : activePage === "history" ? (
            <History />
          ) : activePage === "settings" ? (
            <Settings />
          ) : (
            <PlaceholderPage title={pageNames[activePage]} />
          )}
        </main>

        <footer className="workspace-footer">
          <span>© 2026 Tomato SmartCare</span>
          <span>Pastel Cute Dashboard for Smart Tomato Garden 🍅</span>
        </footer>
      </div>

      <MetricChartModal
        metricKey={selectedMetric}
        onClose={() => setSelectedMetric(null)}
        onSelectMetric={(nextKey) => setSelectedMetric(nextKey)}
      />
    </div>
  );
}

export default App;