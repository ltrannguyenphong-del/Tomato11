import { useCallback, useEffect, useMemo, useState } from "react";
import {
  History as HistoryIcon,
  Search,
  Download,
  ScanSearch,
  Bell,
  CalendarDays,
  Database,
  RefreshCw,
  X,
  Eye,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Sprout,
  AlertTriangle,
} from "lucide-react";

import "../styles/history.css";

const API_BASE_URL = "http://127.0.0.1:5000";
const POLL_INTERVAL_MS = 5000;
const HISTORY_STORAGE_KEY = "tomato_smartcare_ai_alert_history_v1";
const AI_SCANS_STORAGE_KEY = "tomato_smartcare_ai_scans_v1";
const ALERT_REPEAT_STORAGE_KEY = "tomato_smartcare_alert_repeat_mins_v1";
const ALERT_LAST_FIRED_STORAGE_KEY = "tomato_smartcare_alert_last_fired_v1";
const ALERT_WORKFLOW_STORAGE_KEY = "tomato_smartcare_alert_workflow_v1";
const MAX_STORED_ITEMS = 1000;

const REPEAT_OPTIONS = [
  { minutes: 15, label: "15 phút" },
  { minutes: 30, label: "30 phút" },
  { minutes: 45, label: "45 phút" },
  { minutes: 60, label: "1 tiếng (60 phút)" },
];

const AI_DETAIL_ADVICE = {
  Tomato_Bacterial_spot: {
    vi_name: "Bệnh đốm vi khuẩn",
    signs: [
      "Các đốm nhỏ màu nâu sẫm hoặc đen.",
      "Có thể có quầng vàng quanh đốm.",
      "Mô lá bị tổn thương, đôi khi phần giữa đốm khô hoặc rụng.",
      "Bệnh có thể lan mạnh khi lá thường xuyên ướt, mưa tạt hoặc tưới phun lên tán lá.",
    ],
    solutions: [
      "Kiểm tra mặt trên và mặt dưới lá, thân và quả để xác định phạm vi tổn thương.",
      "Tỉa bỏ những lá bị bệnh nặng khi cần thiết; thu gom và loại bỏ tàn dư bệnh khỏi khu vực trồng.",
      "Tưới nước ở gốc, ưu tiên tưới nhỏ giọt; tránh làm ướt lá kéo dài.",
      "Vệ sinh dụng cụ, tránh thao tác trên cây ướt rồi chuyển sang cây khỏe.",
      "Sử dụng hạt giống, cây giống sạch bệnh và luân canh phù hợp.",
    ],
  },
  Tomato_Early_blight: {
    vi_name: "Bệnh cháy lá sớm",
    signs: [
      "Đốm nâu hoặc đen, thường xuất hiện ở lá già phía dưới trước.",
      "Đốm lớn có các vòng đồng tâm giống hình bia bắn.",
      "Vùng quanh đốm có thể vàng, lá nặng có thể khô và rụng.",
    ],
    solutions: [
      "Loại bỏ lá nhiễm bệnh nặng, không tỉa quá nhiều lá trong một lần.",
      "Phủ mặt đất bằng vật liệu thích hợp để hạn chế đất và bào tử bắn lên lá.",
      "Tạo khoảng cách, làm giàn và tỉa tán hợp lý để tăng thông thoáng.",
      "Tưới tại gốc, tránh để lá ướt lâu.",
      "Luân canh với cây không thuộc nhóm ký chủ phù hợp theo hướng dẫn canh tác địa phương.",
      "Khi bệnh tiếp tục lan: kiểm tra tốc độ xuất hiện đốm mới và mức độ rụng lá. Nếu cân nhắc thuốc bảo vệ thực vật, chỉ sử dụng sản phẩm được đăng ký phù hợp, theo đúng nhãn và thời gian cách ly.",
    ],
  },
  Tomato_Late_blight: {
    vi_name: "Bệnh mốc sương / cháy lá muộn",
    signs: [
      "Vết bệnh bất quy tắc, có vẻ úng nước, sau chuyển nâu sẫm.",
      "Tổn thương có thể lan nhanh trên lá, cuống và thân.",
      "Trong điều kiện ẩm ướt, có thể xuất hiện lớp sinh trưởng màu trắng ở rìa vết bệnh hoặc mặt dưới lá.",
    ],
    solutions: [
      "Ưu tiên kiểm tra ngay nếu vết bệnh lan nhanh, đặc biệt sau thời kỳ mưa hoặc ẩm ướt kéo dài.",
      "Hạn chế di chuyển từ cây nghi bệnh sang cây khỏe; vệ sinh dụng cụ và thu gom tàn dư nhiễm bệnh.",
      "Hạn chế tưới lên tán lá, tăng thông thoáng và theo dõi các cây lân cận.",
      "Nếu có dấu hiệu nghiêm trọng, liên hệ cán bộ bảo vệ thực vật để xác minh và lựa chọn biện pháp kiểm soát phù hợp.",
      "Nếu cần dùng thuốc, chọn sản phẩm được đăng ký cho bệnh này trên cà chua, tuân thủ nhãn và hướng dẫn địa phương.",
    ],
  },
  Tomato_Leaf_Mold: {
    vi_name: "Bệnh mốc lá",
    signs: [
      "Đốm vàng nhạt hoặc vàng xanh trên mặt trên lá.",
      "Mặt dưới tương ứng có thể xuất hiện lớp mốc màu ôliu hoặc nâu.",
      "Thường ảnh hưởng đến lá già trước, nhất là nơi thông gió kém và độ ẩm cao.",
    ],
    solutions: [
      "Kiểm tra mặt dưới lá để phân biệt với các bệnh đốm lá khác.",
      "Tăng thông gió trong nhà kính hoặc khu trồng có mái che.",
      "Giảm thời gian lá bị ướt và tránh tưới phun vào buổi chiều tối.",
      "Tỉa bỏ phần lá bệnh nặng, thu gom tàn dư.",
      "Theo dõi độ ẩm không khí liên tục và đối chiếu với lịch sử môi trường.",
    ],
  },
  Tomato_Septoria_leaf_spot: {
    vi_name: "Bệnh đốm lá Septoria",
    signs: [
      "Nhiều đốm nhỏ hình tròn, tâm xám hoặc nâu nhạt, viền sẫm.",
      "Có thể thấy các chấm đen li ti trong đốm khi quan sát kỹ.",
      "Thường xuất hiện ở lá phía dưới rồi lan dần lên trên trong điều kiện thuận lợi.",
    ],
    solutions: [
      "Quan sát kỹ kích thước, viền và tâm của các đốm.",
      "Thu gom lá bệnh, tránh để tàn dư nhiễm bệnh tồn tại dưới gốc.",
      "Dùng lớp phủ mặt đất để hạn chế đất bắn lên lá.",
      "Tăng thông thoáng, tưới tại gốc và không thao tác khi lá đang ướt.",
      "Theo dõi số lá bị ảnh hưởng và sự xuất hiện của đốm mới.",
    ],
  },
  Tomato_Spider_mites_Two_spotted_spider_mite: {
    vi_name: "Nhện đỏ hai chấm",
    signs: [
      "Nhiều chấm vàng hoặc trắng li ti trên lá.",
      "Lá có thể chuyển vàng đồng đều khi mật độ nhện tăng.",
      "Có thể xuất hiện tơ mảnh và nhện rất nhỏ ở mặt dưới lá.",
    ],
    solutions: [
      "Kiểm tra mặt dưới lá bằng kính lúp, tìm nhện, trứng và tơ mảnh.",
      "Loại bỏ lá bị hại nghiêm trọng khi phù hợp.",
      "Kiểm tra các cây lân cận để xác định phạm vi.",
      "Hạn chế tình trạng cây bị thiếu nước; duy trì chăm sóc phù hợp.",
      "Bảo vệ thiên địch có ích và tránh phun thuốc tràn lan làm mất cân bằng sinh học.",
      "Nếu mật độ nhện tăng, lựa chọn biện pháp kiểm soát phù hợp với cây cà chua và nhãn sản phẩm.",
    ],
  },
  Tomato__Target_Spot: {
    vi_name: "Bệnh đốm vòng mục tiêu",
    signs: [
      "Đốm nâu trên lá, có thể có các vòng đồng tâm.",
      "Vết bệnh có thể lan rộng, làm mô lá vàng và khô.",
      "Có thể nhầm với cháy lá sớm do cùng xuất hiện những đốm có dạng vòng.",
    ],
    solutions: [
      "Chụp ảnh rõ cả mặt trên và mặt dưới lá, ghi nhận vị trí và mức độ tổn thương.",
      "Loại bỏ lá bệnh nặng và thu gom tàn dư thực vật.",
      "Tăng thông thoáng, tưới tại gốc và hạn chế lá ướt kéo dài.",
      "Theo dõi sự xuất hiện của các đốm mới ở những lá khác.",
      "Nếu bệnh lan rộng, xác minh nguyên nhân trước khi chọn thuốc kiểm soát nấm phù hợp.",
    ],
  },
  Tomato__Tomato_YellowLeaf__Curl_Virus: {
    vi_name: "Bệnh xoăn vàng lá cà chua",
    signs: [
      "Lá non vàng, cong hoặc cuốn lên.",
      "Phiến lá có thể nhỏ, biến dạng.",
      "Cây còi cọc, sinh trưởng kém, giảm khả năng đậu quả.",
      "Bệnh có liên quan đến virus được truyền chủ yếu bởi bọ phấn trắng.",
    ],
    solutions: [
      "Kiểm tra lá non và mặt dưới lá, tìm bọ phấn trắng.",
      "Kiểm tra các cây xung quanh để phát hiện cây có biểu hiện tương tự.",
      "Hạn chế bọ phấn trắng bằng biện pháp quản lý dịch hại tổng hợp phù hợp.",
      "Sử dụng cây giống sạch bệnh và giống có khả năng kháng virus nếu phù hợp.",
      "Nếu nghi nhiễm nặng, cách ly thao tác chăm sóc và nhờ chuyên gia xác minh.",
      "Khi xác nhận cây nhiễm virus, cân nhắc loại bỏ cây bệnh theo hướng dẫn chuyên môn để giảm nguồn lây.",
    ],
  },
  Tomato__Tomato_mosaic_virus: {
    vi_name: "Bệnh khảm lá cà chua",
    signs: [
      "Mảng xanh đậm và xanh nhạt xen kẽ trên lá.",
      "Lá có thể nhăn, biến dạng hoặc phát triển không đồng đều.",
      "Cây có thể còi cọc; mức độ biểu hiện phụ thuộc giống và điều kiện trồng.",
    ],
    solutions: [
      "Tách riêng việc chăm sóc cây nghi nhiễm để hạn chế lây qua tay và dụng cụ.",
      "Rửa tay và vệ sinh dụng cụ sau khi tiếp xúc với cây nghi nhiễm.",
      "Không sử dụng hạt giống từ cây nghi bệnh.",
      "Kiểm tra nguồn cây giống và vệ sinh khu vực trồng.",
      "Xác minh với chuyên gia khi cần phân biệt virus với thiếu dinh dưỡng, tổn thương hóa chất hoặc các nguyên nhân khác.",
    ],
  },
  Tomato_healthy: {
    vi_name: "Lá cà chua khỏe mạnh",
    signs: [
      "Mô hình đánh giá ảnh gần với lớp lá khỏe mạnh trong tập huấn luyện.",
      "Đây không phải bằng chứng rằng toàn bộ cây không có bệnh, sâu hại hoặc vấn đề ở rễ.",
    ],
    solutions: [
      "Tiếp tục theo dõi các thông số môi trường.",
      "Kiểm tra mặt dưới lá và thân cây định kỳ.",
      "Duy trì thông thoáng, tưới phù hợp và vệ sinh khu vực trồng.",
      "Chụp ảnh mới nếu phát hiện biến đổi màu sắc, đốm lá hoặc lá biến dạng.",
      "Không phun thuốc phòng bệnh chỉ vì mục đích phòng ngừa nếu chưa có căn cứ cần thiết.",
    ],
  },
  Not_tomato: {
    vi_name: "Ảnh không phải lá cà chua",
    signs: [
      "Ảnh đầu vào được mô hình phân loại vào lớp không phải cà chua.",
      "Đây là lớp từ chối đầu vào không phù hợp, không phải bệnh cây.",
    ],
    solutions: [
      "Ảnh có thể không phải lá cà chua hoặc chưa đủ điều kiện để phân tích.",
      "Tải ảnh mới, chụp một lá cà chua rõ nét, đủ sáng và không bị che khuất.",
      "Nếu ảnh thực sự là lá cà chua nhưng vẫn bị phân loại sai, lưu lại trường hợp để đánh giá mô hình.",
    ],
  },
  "Không phải lá cà chua": {
    vi_name: "Ảnh không phải lá cà chua",
    signs: [
      "Ảnh đầu vào được mô hình phân loại vào lớp không phải cà chua.",
      "Đây là lớp từ chối đầu vào không phù hợp, không phải bệnh cây.",
    ],
    solutions: [
      "Ảnh có thể không phải lá cà chua hoặc chưa đủ điều kiện để phân tích.",
      "Tải ảnh mới, chụp một lá cà chua rõ nét, đủ sáng và không bị che khuất.",
      "Nếu ảnh thực sự là lá cà chua nhưng vẫn bị phân loại sai, lưu lại trường hợp để đánh giá mô hình.",
    ],
  },
  "Không chắc, cần chụp lại": {
    vi_name: "Chưa đủ độ tin cậy để kết luận",
    signs: ["Mức phân biệt giữa các lớp chưa đủ rõ ràng từ ảnh hiện tại."],
    solutions: [
      "Chụp lại lá cà chua rõ nét hơn, đủ ánh sáng tự nhiên và lấy rõ vùng tổn thương.",
      "Chụp cả mặt trên và mặt dưới lá nếu có dấu hiệu bất thường.",
    ],
  },
};

function resolveAiSignsAndSolutions(label, rawScan = {}) {
  const fb = AI_DETAIL_ADVICE[label] || {};
  const signs =
    Array.isArray(rawScan?.signs) && rawScan.signs.length > 0
      ? rawScan.signs
      : Array.isArray(rawScan?.advice?.signs) && rawScan.advice.signs.length > 0
      ? rawScan.advice.signs
      : fb.signs || [];

  const solutions =
    Array.isArray(rawScan?.solutions) && rawScan.solutions.length > 0
      ? rawScan.solutions
      : Array.isArray(rawScan?.advice?.solutions) &&
        rawScan.advice.solutions.length > 0
      ? rawScan.advice.solutions
      : fb.solutions || [];

  return { signs, solutions };
}

const typeConfig = {
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

function formatDateVN(date = new Date()) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatTimeVN(date = new Date()) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function loadRepeatMinutes() {
  try {
    const raw = localStorage.getItem(ALERT_REPEAT_STORAGE_KEY);
    const num = Number(raw);
    if ([15, 30, 45, 60].includes(num)) return num;
  } catch {
    // Bỏ qua lỗi đọc localStorage
  }
  return 30;
}

function saveRepeatMinutes(mins) {
  try {
    localStorage.setItem(ALERT_REPEAT_STORAGE_KEY, String(mins));
  } catch {
    // Bỏ qua lỗi ghi localStorage
  }
}

function loadLastFiredMap() {
  try {
    const raw = localStorage.getItem(ALERT_LAST_FIRED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLastFiredMap(mapObj) {
  try {
    localStorage.setItem(ALERT_LAST_FIRED_STORAGE_KEY, JSON.stringify(mapObj));
  } catch {
    // Bỏ qua lỗi ghi localStorage
  }
}

function loadAlertWorkflowMap() {
  try {
    const raw = localStorage.getItem(ALERT_WORKFLOW_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveAlertWorkflowMap(mapObj) {
  try {
    localStorage.setItem(ALERT_WORKFLOW_STORAGE_KEY, JSON.stringify(mapObj));
  } catch {
    // Bỏ qua lỗi ghi localStorage
  }
}

function getAlertWorkflowLabel(codeOrId, workflowMap) {
  const wf = workflowMap[codeOrId];
  if (!wf) return "Chưa xử lý";
  if (wf.resolved) return "Đã xử lý";
  if (wf.acknowledged) return "Đã xác nhận";
  return "Chưa xử lý";
}

function loadSavedHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && (item.type === "ai" || item.type === "alert"))
      .slice(-MAX_STORED_ITEMS);
  } catch {
    return [];
  }
}

function saveHistory(items) {
  try {
    const filtered = items
      .filter((item) => item && (item.type === "ai" || item.type === "alert"))
      .slice(-MAX_STORED_ITEMS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Bỏ qua nếu đầy bộ nhớ trình duyệt
  }
}

function readStoredAiScans() {
  try {
    const raw = localStorage.getItem(AI_SCANS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function detectEnvironmentAlerts({ temperature, humidity, soil, light, now }) {
  const alerts = [];
  const hour = now.getHours();
  const isDaytime = hour >= 6 && hour < 18;
  const timeLabel = `${formatDateVN(now)} ${formatTimeVN(now)}`;
  const nowIso = now.toISOString();

  if (Number.isFinite(temperature)) {
    if (temperature >= 38) {
      alerts.push({
        code: "temp_danger",
        title: "Cảnh báo nhiệt độ nguy hiểm",
        cause:
          "Nhiệt độ không khí vượt mức nguy hiểm cho sinh trưởng và thụ phấn của cà chua.",
        measuredValue: `${temperature.toFixed(1)}°C`,
        threshold: "≥ 38.0°C (Nguy hiểm)",
        startTime: timeLabel,
        endTime: timeLabel,
        startIso: nowIso,
        endIso: nowIso,
        recommendation:
          "Can thiệp làm mát ngay, tăng thông gió, che nắng phù hợp và kiểm tra độ ẩm đất trước khi tưới.",
        detail: `Nhiệt độ ${temperature.toFixed(1)}°C (ngưỡng ≥ 38°C) · Cần làm mát ngay`,
        status: "Nguy hiểm",
        statusType: "danger",
      });
    } else if (temperature > 34) {
      alerts.push({
        code: "temp_high",
        title: "Cảnh báo nhiệt độ cao",
        cause:
          "Nhiệt độ không khí cao có thể gây stress nhiệt hoặc héo lá nếu kéo dài.",
        measuredValue: `${temperature.toFixed(1)}°C`,
        threshold: "> 34.0°C (Cảnh báo / Nguy cơ cao)",
        startTime: timeLabel,
        endTime: timeLabel,
        startIso: nowIso,
        endIso: nowIso,
        recommendation:
          "Tăng thông gió, che lưới giảm nắng phù hợp, kiểm tra độ ẩm đất và tình trạng héo.",
        detail: `Nhiệt độ ${temperature.toFixed(1)}°C (ngưỡng > 34°C) · Che nắng & tăng thông gió`,
        status: "Cần chú ý",
        statusType: "warning",
      });
    } else if (temperature < 15) {
      alerts.push({
        code: "temp_cold",
        title: "Cảnh báo nhiệt độ thấp",
        cause:
          "Nhiệt độ không khí thấp làm chậm trao đổi chất và phát triển của cây cà chua.",
        measuredValue: `${temperature.toFixed(1)}°C`,
        threshold: "< 15.0°C (Cảnh báo lạnh)",
        startTime: timeLabel,
        endTime: timeLabel,
        startIso: nowIso,
        endIso: nowIso,
        recommendation:
          "Theo dõi tốc độ sinh trưởng, che chắn giữ ấm, tránh gió lạnh và hạn chế tưới quá mức.",
        detail: `Nhiệt độ ${temperature.toFixed(1)}°C (ngưỡng < 15°C) · Che chắn giữ ấm`,
        status: "Cần chú ý",
        statusType: "warning",
      });
    }
  }

  if (Number.isFinite(humidity)) {
    if (humidity > 90) {
      alerts.push({
        code: "rh_danger",
        title: "Cảnh báo độ ẩm không khí rất cao",
        cause:
          "Độ ẩm không khí vượt 90% RH làm tăng nguy cơ phát sinh và lây lan bệnh lá.",
        measuredValue: `${Math.round(humidity)}% RH`,
        threshold: "> 90% RH (Nguy hiểm)",
        startTime: timeLabel,
        endTime: timeLabel,
        startIso: nowIso,
        endIso: nowIso,
        recommendation:
          "Ưu tiên giảm ẩm, tăng lưu thông không khí, kiểm tra mặt dưới lá và kết hợp quan sát / chẩn đoán AI.",
        detail: `Độ ẩm KK ${Math.round(humidity)}% (ngưỡng > 90%) · Nguy cơ bệnh lá`,
        status: "Nguy hiểm",
        statusType: "danger",
      });
    } else if (humidity > 85) {
      alerts.push({
        code: "rh_high",
        title: "Cảnh báo độ ẩm không khí cao",
        cause:
          "Độ ẩm không khí cao dễ đọng ẩm trên lá, đặc biệt vào chiều tối.",
        measuredValue: `${Math.round(humidity)}% RH`,
        threshold: "> 85% RH (Nguy cơ cao)",
        startTime: timeLabel,
        endTime: timeLabel,
        startIso: nowIso,
        endIso: nowIso,
        recommendation:
          "Tăng lưu thông không khí, tránh tưới lên lá vào chiều tối và kiểm tra dấu hiệu bệnh trên lá.",
        detail: `Độ ẩm KK ${Math.round(humidity)}% (ngưỡng > 85%) · Tăng lưu thông không khí`,
        status: "Cần chú ý",
        statusType: "warning",
      });
    }
  }

  if (Number.isFinite(soil)) {
    if (soil < 15 || soil > 90) {
      const isDry = soil < 15;
      alerts.push({
        code: "soil_danger",
        title: isDry
          ? "Cảnh báo đất rất khô"
          : "Cảnh báo đất rất ẩm / nguy cơ úng",
        cause: isDry
          ? "Độ ẩm vùng rễ xuống mức rất thấp, cây dễ thiếu nước nghiêm trọng."
          : "Độ ẩm đất rất cao, nguy cơ thiếu oxy vùng rễ và úng nước.",
        measuredValue: `${soil.toFixed(1)}%`,
        threshold: "< 15% hoặc > 90% (Nguy hiểm)",
        startTime: timeLabel,
        endTime: timeLabel,
        startIso: nowIso,
        endIso: nowIso,
        recommendation: isDry
          ? "Kiểm tra đất tại vùng rễ và tưới từ từ nếu xác nhận thiếu nước."
          : "Kiểm tra nguy cơ úng và tình trạng vùng rễ ngay; tạm hoãn tưới và cải thiện thoát nước.",
        detail: `Độ ẩm đất ${soil.toFixed(1)}% · Kiểm tra vùng rễ ngay`,
        status: "Nguy hiểm",
        statusType: "danger",
      });
    } else if (soil < 25 || soil > 80) {
      const isLow = soil < 25;
      alerts.push({
        code: "soil_warn",
        title: isLow ? "Cảnh báo thiếu ẩm đất" : "Cảnh báo nguy cơ úng nước",
        cause: isLow
          ? "Độ ẩm vùng rễ thấp hơn mức vận hành mục tiêu."
          : "Độ ẩm đất cao vượt ngưỡng 80%, cần theo dõi thoát nước.",
        measuredValue: `${soil.toFixed(1)}%`,
        threshold: "< 25% hoặc > 80% (Cảnh báo)",
        startTime: timeLabel,
        endTime: timeLabel,
        startIso: nowIso,
        endIso: nowIso,
        recommendation: isLow
          ? "Tưới bổ sung từ từ và đo lại độ ẩm đất."
          : "Tạm hoãn tưới, kiểm tra lỗ thoát nước và tình trạng vùng rễ.",
        detail: `Độ ẩm đất ${soil.toFixed(1)}% · Điều chỉnh tưới & thoát nước`,
        status: "Cần chú ý",
        statusType: "warning",
      });
    }
  }

  if (isDaytime && Number.isFinite(light) && light < 5000) {
    alerts.push({
      code: "light_low",
      title: "Cảnh báo thiếu sáng ban ngày",
      cause:
        "Cường độ ánh sáng ban ngày (06:00–17:59) thấp hơn ngưỡng 5.000 lux.",
      measuredValue: `${Math.round(light)} lux`,
      threshold: "< 5.000 lux ban ngày",
      startTime: timeLabel,
      endTime: timeLabel,
      startIso: nowIso,
      endIso: nowIso,
      recommendation:
        "Kiểm tra mái che, vị trí đặt cây và vật cản ánh sáng vào ban ngày.",
      detail: `Ánh sáng ${Math.round(light)} lux vào ban ngày (< 5.000 lux)`,
      status: "Cần chú ý",
      statusType: "warning",
    });
  }

  return alerts;
}

function buildAiHistoryItem(rawScan, fallbackNow = new Date()) {
  if (!rawScan) return null;
  const label =
    rawScan.label ||
    rawScan.prediction ||
    rawScan.disease ||
    rawScan.result?.prediction ||
    null;
  if (!label) return null;

  const rawTs = rawScan.timestamp;
  const parsedDt = rawTs ? new Date(rawTs) : fallbackNow;
  const validDt = !Number.isNaN(parsedDt.getTime()) ? parsedDt : fallbackNow;

  const confRaw = Number(
    rawScan.confidence !== undefined
      ? rawScan.confidence
      : rawScan.result?.confidence
  );
  const confPct = Number.isFinite(confRaw)
    ? (confRaw <= 1 ? confRaw * 100 : confRaw).toFixed(1)
    : null;

  const viName =
    rawScan.viName ||
    rawScan.advice?.vi_name ||
    rawScan.result?.adviceObj?.vi_name ||
    AI_DETAIL_ADVICE[label]?.vi_name ||
    label;

  const recommendation =
    rawScan.recommendation ||
    rawScan.advice?.note ||
    rawScan.advice?.tip ||
    rawScan.result?.recommendation ||
    rawScan.result?.advice?.tip ||
    "Theo dõi thêm tình trạng thực tế trên lá, đảm bảo thông gió và tưới nước hợp lý.";

  const imageSrc =
    rawScan.image ||
    rawScan.imageUrl ||
    rawScan.image_url ||
    rawScan.previewUrl ||
    rawScan.thumbnail ||
    rawScan.result?.image ||
    rawScan.result?.imageUrl ||
    null;

  const { signs, solutions } = resolveAiSignsAndSolutions(label, rawScan);

  const scanId =
    rawScan.scanId ||
    rawScan.id ||
    `ai-scan-${validDt.getTime()}-${String(label).replace(/\s+/g, "_")}`;

  const dateStr = formatDateVN(validDt);
  const timeStr = formatTimeVN(validDt);

  return {
    id: scanId,
    timestamp: validDt.toISOString(),
    date: dateStr,
    time: timeStr,
    type: "ai",
    title: "Nhận diện lá cà chua (AI)",
    detail: `${viName} (${label})${confPct ? ` · Độ tin cậy: ${confPct}%` : ""}`,
    status: "Hoàn thành",
    statusType: "normal",
    aiMeta: {
      label,
      viName,
      confidencePct: confPct ? `${confPct}%` : "Chưa ghi nhận",
      analyzedAt: `${dateStr} ${timeStr}`,
      imageSrc,
      signs,
      solutions,
      recommendation,
      supportNote:
        "Kết quả dự đoán từ AI chỉ mang tính hỗ trợ tham khảo; không khẳng định chắc chắn cây mắc bệnh nếu chưa được kiểm tra/xác minh trực tiếp trên lá và cây.",
    },
  };
}

function downloadCSV(rows, alertWorkflowMap) {
  const headers = ["Ngày", "Giờ", "Loại", "Hoạt động", "Chi tiết", "Trạng thái"];

  const content = [
    headers,
    ...rows.map((row) => {
      const wfText =
        row.type === "alert"
          ? ` (${getAlertWorkflowLabel(
              row.alertMeta?.code || row.id,
              alertWorkflowMap
            )})`
          : "";
      return [
        row.date,
        row.time,
        typeConfig[row.type]?.label || row.type,
        row.title,
        row.detail,
        `${row.status}${wfText}`,
      ];
    }),
  ]
    .map((row) =>
      row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tomato_ai_alerts_history_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DetailModal({
  record,
  onClose,
  alertWorkflowMap,
  onToggleAcknowledge,
  onToggleResolved,
}) {
  if (!record) return null;

  const wfKey = record.alertMeta?.code || record.id;
  const wf = alertWorkflowMap[wfKey] || {
    acknowledged: false,
    resolved: false,
  };

  const resolvedAi =
    record.type === "ai"
      ? resolveAiSignsAndSolutions(record.aiMeta?.label, record.aiMeta)
      : { signs: [], solutions: [] };

  return (
    <div
      className="history-modal-backdrop"
      onClick={onClose}
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
        className="history-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "620px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "22px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.22)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              {typeConfig[record.type]?.label || "Bản ghi"} · ID: {record.id}
            </span>
            <h3 style={{ margin: "4px 0 0", fontSize: "19px" }}>
              {record.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ chi tiết"
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

        {record.type === "alert" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            <div>
              <strong>Nguyên nhân: </strong>
              <span>{record.alertMeta?.cause || record.detail}</span>
            </div>
            <div>
              <strong>Giá trị đo: </strong>
              <span>{record.alertMeta?.measuredValue || "--"}</span>
            </div>
            <div>
              <strong>Ngưỡng áp dụng: </strong>
              <span>{record.alertMeta?.threshold || "--"}</span>
            </div>
            <div>
              <strong>Thời gian bắt đầu: </strong>
              <span>
                {record.alertMeta?.startTime || `${record.date} ${record.time}`}
              </span>
            </div>
            <div>
              <strong>Thời gian kết thúc: </strong>
              <span>
                {record.alertMeta?.endTime || `${record.date} ${record.time}`}
              </span>
            </div>
            <div>
              <strong>Khuyến nghị xử lý: </strong>
              <span>
                {record.alertMeta?.recommendation ||
                  "Kiểm tra trực tiếp tình trạng cây và thông gió."}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                paddingTop: "6px",
              }}
            >
              <strong>Trạng thái xử lý:</strong>
              <span
                className={`history-status ${
                  wf.resolved ? "normal" : "warning"
                }`}
              >
                {wf.resolved
                  ? "Đã xử lý"
                  : wf.acknowledged
                  ? "Đã xác nhận"
                  : "Chưa xử lý"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginTop: "6px",
              }}
            >
              <button
                type="button"
                className="history-export"
                onClick={() => onToggleAcknowledge(wfKey)}
              >
                <ShieldAlert size={16} />
                {wf.acknowledged
                  ? "Bỏ đánh dấu đã xác nhận"
                  : "Đánh dấu đã xác nhận"}
              </button>

              <button
                type="button"
                className="history-export"
                onClick={() => onToggleResolved(wfKey)}
              >
                <CheckCircle2 size={16} />
                {wf.resolved ? "Bỏ đánh dấu đã xử lý" : "Đánh dấu đã xử lý"}
              </button>
            </div>
          </div>
        )}

        {record.type === "ai" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {record.aiMeta?.imageSrc ? (
              <div
                style={{
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  textAlign: "center",
                }}
              >
                <img
                  src={record.aiMeta.imageSrc}
                  alt={record.aiMeta.label || "Ảnh lá cà chua"}
                  style={{
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "contain",
                    display: "block",
                    margin: "0 auto",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Không có ảnh lưu kèm cho lần quét AI này.
              </div>
            )}

            <div>
              <strong>Nhãn dự đoán: </strong>
              <span>
                {record.aiMeta?.viName
                  ? `${record.aiMeta.viName} (${record.aiMeta.label})`
                  : record.aiMeta?.label || record.detail}
              </span>
            </div>

            <div>
              <strong>Điểm tin cậy: </strong>
              <span>{record.aiMeta?.confidencePct || "Chưa ghi nhận"}</span>
            </div>

            <div>
              <strong>Thời gian phân tích: </strong>
              <span>
                {record.aiMeta?.analyzedAt || `${record.date} ${record.time}`}
              </span>
            </div>

            <div>
              <strong>Khuyến nghị phù hợp: </strong>
              <span>{record.aiMeta?.recommendation}</span>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                fontSize: "13px",
              }}
            >
              <strong>Lưu ý hỗ trợ: </strong>
              {record.aiMeta?.supportNote}
            </div>

            {resolvedAi.signs.length > 0 && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    marginBottom: "6px",
                  }}
                >
                  <AlertTriangle size={15} />
                  <span>Dấu hiệu thường gặp / Ý nghĩa kết quả</span>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  {resolvedAi.signs.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: "3px" }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {resolvedAi.solutions.length > 0 && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "14px",
                  background: "#fff8fa",
                  border: "1px solid #fde2e8",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    marginBottom: "6px",
                  }}
                >
                  <Sprout size={15} />
                  <span>Giải pháp khuyến nghị</span>
                </div>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  {resolvedAi.solutions.map((sol, idx) => (
                    <li key={idx} style={{ marginBottom: "3px" }}>
                      {sol}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function History() {
  const [records, setRecords] = useState(() => loadSavedHistory());
  const [repeatMinutes, setRepeatMinutes] = useState(() => loadRepeatMinutes());
  const [lastFiredMap, setLastFiredMap] = useState(() => loadLastFiredMap());
  const [alertWorkflowMap, setAlertWorkflowMap] = useState(() =>
    loadAlertWorkflowMap()
  );
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleChangeRepeatMinutes = useCallback((mins) => {
    const val = Number(mins);
    if (![15, 30, 45, 60].includes(val)) return;
    setRepeatMinutes(val);
    saveRepeatMinutes(val);
  }, []);

  const mergeStoredAiScans = useCallback(() => {
    const storedScans = readStoredAiScans();
    if (storedScans.length === 0) return;

    const normalizedList = storedScans
      .map((sc) => buildAiHistoryItem(sc))
      .filter(Boolean);
    if (normalizedList.length === 0) return;

    setRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const additions = normalizedList.filter(
        (item) => !existingIds.has(item.id)
      );
      if (additions.length === 0) return prev;
      const updated = [...prev, ...additions].slice(-MAX_STORED_ITEMS);
      saveHistory(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    mergeStoredAiScans();

    const onAiScanned = (event) => {
      const scanItem = buildAiHistoryItem(event?.detail, new Date());
      if (!scanItem) return;

      setRecords((prev) => {
        if (prev.some((r) => r.id === scanItem.id)) return prev;
        const updated = [...prev, scanItem].slice(-MAX_STORED_ITEMS);
        saveHistory(updated);
        return updated;
      });
    };

    window.addEventListener("tomato-ai-scanned", onAiScanned);
    return () => window.removeEventListener("tomato-ai-scanned", onAiScanned);
  }, [mergeStoredAiScans]);

  const syncAlertsAndAiScans = useCallback(async () => {
    setSyncing(true);
    try {
      mergeStoredAiScans();

      const now = new Date();
      const nowMs = now.getTime();
      const repeatMs = repeatMinutes * 60 * 1000;
      const timeLabel = `${formatDateVN(now)} ${formatTimeVN(now)}`;
      const newAlerts = [];
      const activeCodesNow = new Set();
      const nextFiredMap = { ...lastFiredMap };
      let firedChanged = false;

      const sensorRes = await fetch(`${API_BASE_URL}/api/sensors`, {
        cache: "no-store",
      });

      if (sensorRes.ok) {
        const payload = await sensorRes.json();
        const hasValidReading =
          payload &&
          payload.status !== "No Data" &&
          !payload.error &&
          (Number(payload.temperature) !== 0 ||
            Number(payload.humidity) !== 0 ||
            Number(payload.soil_moisture) !== 0 ||
            Number(payload.soil_adc) !== 0 ||
            Number(payload.light_lux) !== 0);

        if (hasValidReading) {
          const detected = detectEnvironmentAlerts({
            temperature: Number(payload.temperature),
            humidity: Number(payload.humidity),
            soil: Number(payload.soil_moisture),
            light: Number(payload.light_lux),
            now,
          });

          for (const al of detected) {
            activeCodesNow.add(al.code);
            const prevFiredMs = Number(nextFiredMap[al.code] || 0);
            if (!prevFiredMs || nowMs - prevFiredMs >= repeatMs) {
              nextFiredMap[al.code] = nowMs;
              firedChanged = true;
              newAlerts.push({
                id: `alert-${al.code}-${nowMs}`,
                timestamp: now.toISOString(),
                date: formatDateVN(now),
                time: formatTimeVN(now),
                type: "alert",
                title: al.title,
                detail: al.detail,
                status: al.status,
                statusType: al.statusType,
                alertMeta: {
                  code: al.code,
                  cause: al.cause,
                  measuredValue: al.measuredValue,
                  threshold: al.threshold,
                  startTime: al.startTime,
                  endTime: al.endTime,
                  recommendation: al.recommendation,
                  repeatMinutes,
                },
              });
            }
          }
        }
      }

      if (firedChanged) {
        setLastFiredMap(nextFiredMap);
        saveLastFiredMap(nextFiredMap);
      }

      setRecords((prev) => {
        let changed = false;
        const updatedPrev = prev.map((rec) => {
          if (
            rec.type === "alert" &&
            rec.alertMeta?.code &&
            activeCodesNow.has(rec.alertMeta.code)
          ) {
            const isLatestOfCode = !prev.some(
              (other) =>
                other.type === "alert" &&
                other.alertMeta?.code === rec.alertMeta.code &&
                other.timestamp > rec.timestamp
            );
            if (isLatestOfCode) {
              changed = true;
              return {
                ...rec,
                alertMeta: {
                  ...rec.alertMeta,
                  endTime: timeLabel,
                },
              };
            }
          }
          return rec;
        });

        const existingIds = new Set(updatedPrev.map((r) => r.id));
        const toAdd = newAlerts.filter((a) => !existingIds.has(a.id));
        if (!changed && toAdd.length === 0) return prev;

        const merged = [...updatedPrev, ...toAdd].slice(-MAX_STORED_ITEMS);
        saveHistory(merged);
        return merged;
      });
    } catch {
      // Bỏ qua lỗi mạng tạm thời
    } finally {
      setSyncing(false);
    }
  }, [lastFiredMap, mergeStoredAiScans, repeatMinutes]);

  useEffect(() => {
    syncAlertsAndAiScans();
    const timer = setInterval(syncAlertsAndAiScans, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [syncAlertsAndAiScans]);

  const handleToggleAcknowledge = useCallback((wfKey) => {
    setAlertWorkflowMap((prev) => {
      const current = prev[wfKey] || { acknowledged: false, resolved: false };
      const next = {
        ...prev,
        [wfKey]: {
          ...current,
          acknowledged: !current.acknowledged,
        },
      };
      saveAlertWorkflowMap(next);
      return next;
    });
  }, []);

  const handleToggleResolved = useCallback((wfKey) => {
    setAlertWorkflowMap((prev) => {
      const current = prev[wfKey] || { acknowledged: false, resolved: false };
      const nextResolved = !current.resolved;
      const next = {
        ...prev,
        [wfKey]: {
          acknowledged: nextResolved ? true : current.acknowledged,
          resolved: nextResolved,
        },
      };
      saveAlertWorkflowMap(next);
      return next;
    });
  }, []);

  const orderedRecords = useMemo(() => {
    return [...records]
      .filter((r) => r.type === "ai" || r.type === "alert")
      .reverse();
  }, [records]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");

    return orderedRecords.filter((item) => {
      const matchesType = filter === "all" || item.type === filter;

      const searchableText = [
        item.title,
        item.detail,
        item.date,
        item.time,
        item.status,
        typeConfig[item.type]?.label || "",
      ]
        .join(" ")
        .toLocaleLowerCase("vi-VN");

      return matchesType && (!keyword || searchableText.includes(keyword));
    });
  }, [orderedRecords, filter, search]);

  const selected = useMemo(
    () => orderedRecords.find((item) => item.id === selectedId) || null,
    [orderedRecords, selectedId]
  );

  const aiCount = useMemo(
    () => orderedRecords.filter((item) => item.type === "ai").length,
    [orderedRecords]
  );

  const alertCount = useMemo(
    () => orderedRecords.filter((item) => item.type === "alert").length,
    [orderedRecords]
  );

  return (
    <div className="history-page">
      <section className="history-heading">
        <div>
          <span className="history-eyebrow">
            TOMATO SMARTCARE / AI & ALERTS LOG
          </span>

          <h2>Nhật ký AI & Cảnh báo</h2>

          <p>
            Lưu lịch sử mỗi lần quét chẩn đoán AI và theo dõi cảnh báo theo chu kỳ lặp.
          </p>
        </div>

        <div className="history-heading-icon">
          <HistoryIcon size={29} />
        </div>
      </section>

      <section className="history-stats">
        <div className="history-stat history-stat-total">
          <div className="history-stat-icon">
            <Database size={21} />
          </div>
          <div>
            <span>Tổng bản ghi</span>
            <strong>{orderedRecords.length}</strong>
          </div>
        </div>

        <div className="history-stat history-stat-ai">
          <div className="history-stat-icon">
            <ScanSearch size={21} />
          </div>
          <div>
            <span>Lượt quét AI</span>
            <strong>{aiCount}</strong>
          </div>
        </div>

        <div className="history-stat history-stat-alert">
          <div className="history-stat-icon">
            <Bell size={21} />
          </div>
          <div>
            <span>Cảnh báo đã ghi</span>
            <strong>{alertCount}</strong>
          </div>
        </div>

        <div className="history-stat history-stat-sensor">
          <div className="history-stat-icon">
            <Clock size={21} />
          </div>
          <div>
            <span>Chu kỳ lặp cảnh báo</span>
            <strong>{repeatMinutes} phút</strong>
          </div>
        </div>
      </section>

      <section className="history-panel">
        <div className="history-panel-top">
          <div>
            <h3>Lịch sử AI & Cảnh báo</h3>
            <p>
              Chu kỳ lặp cảnh báo hiện tại: <strong>{repeatMinutes} phút</strong> · AI chỉ lưu khi quét chẩn đoán mới
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <Clock size={15} />
              Lặp cảnh báo:
              <select
                value={repeatMinutes}
                onChange={(e) => handleChangeRepeatMinutes(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {REPEAT_OPTIONS.map((opt) => (
                  <option key={opt.minutes} value={opt.minutes}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="history-export"
              onClick={syncAlertsAndAiScans}
              disabled={syncing}
            >
              <RefreshCw size={16} />
              {syncing ? "Đang cập nhật..." : "Cập nhật"}
            </button>

            <button
              type="button"
              className="history-export"
              onClick={() => downloadCSV(filteredRows, alertWorkflowMap)}
            >
              <Download size={17} />
              Xuất CSV
            </button>
          </div>
        </div>

        <div className="history-toolbar">
          <div className="history-search">
            <Search size={17} />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm nhãn AI, cảnh báo, ngày, trạng thái..."
            />
          </div>

          <div className="history-filters">
            {[
              ["all", "Tất cả"],
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
                const config = typeConfig[item.type] || typeConfig.ai;
                const Icon = config.icon;
                const wfText =
                  item.type === "alert"
                    ? ` · ${getAlertWorkflowLabel(
                        item.alertMeta?.code || item.id,
                        alertWorkflowMap
                      )}`
                    : "";

                return (
                  <tr
                    key={item.id}
                    className={selectedId === item.id ? "selected" : ""}
                    onClick={() => {
                      setSelectedId(item.id);
                      setModalOpen(true);
                    }}
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
                      <span className={`history-type ${config.className}`}>
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
                      <span className={`history-status ${item.statusType}`}>
                        {item.status}
                        {wfText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredRows.length === 0 && (
            <div className="history-empty">
              Chưa có bản ghi AI hoặc cảnh báo nào khớp với bộ lọc hiện tại.
            </div>
          )}
        </div>

        <div className="history-panel-footer">
          <span>
            Hiển thị {filteredRows.length} / {orderedRecords.length} bản ghi
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>
              {selected
                ? `Đang chọn: ${selected.title} (${selected.date} ${selected.time})`
                : "Nhấn vào một dòng để xem chi tiết bản ghi"}
            </span>
            {selected && (
              <button
                type="button"
                className="history-export"
                style={{ padding: "5px 10px", fontSize: "12px" }}
                onClick={() => setModalOpen(true)}
              >
                <Eye size={14} />
                Xem chi tiết
              </button>
            )}
          </div>
        </div>
      </section>

      {modalOpen && selected && (
        <DetailModal
          record={selected}
          onClose={() => setModalOpen(false)}
          alertWorkflowMap={alertWorkflowMap}
          onToggleAcknowledge={handleToggleAcknowledge}
          onToggleResolved={handleToggleResolved}
        />
      )}
    </div>
  );
}

export default History;