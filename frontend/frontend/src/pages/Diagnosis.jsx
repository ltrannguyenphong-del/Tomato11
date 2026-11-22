import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  ImagePlus,
  Sparkles,
  Heart,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ScanSearch,
  Info,
  Sprout,
  ShieldAlert,
} from "lucide-react";

import "../styles/diagnosis.css";

const API_URL = "http://127.0.0.1:5000/api/predict";
const STORAGE_KEY = "tomato_smartcare_diagnosis_state_v1";
const AI_SCANS_STORAGE_KEY = "tomato_smartcare_ai_scans_v1";

const FALLBACK_ADVICE = {
  Tomato_Bacterial_spot: {
    vi_name: "Bệnh đốm vi khuẩn",
    category: "Bệnh do vi khuẩn",
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
    note: "Đây là bệnh do vi khuẩn, không nên mặc định thuốc trừ nấm thông thường sẽ điều trị được. Nếu cần sử dụng chế phẩm bảo vệ thực vật, phải chọn sản phẩm được phép sử dụng cho cà chua tại địa phương và tuân thủ nhãn.",
  },
  Tomato_Early_blight: {
    vi_name: "Bệnh cháy lá sớm",
    category: "Bệnh nấm",
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
    note: "Các bệnh đốm lá có thể có triệu chứng tương tự nhau nên cần kiểm tra thêm trên cây thật.",
  },
  Tomato_Late_blight: {
    vi_name: "Bệnh mốc sương / cháy lá muộn",
    category: "Bệnh nấm / giả nấm · Mức ưu tiên: Cao",
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
    note: "Mức ưu tiên đề xuất cho hệ thống: Cao. Bệnh này có thể phát triển và lây lan nhanh trong điều kiện thuận lợi, vì vậy cần kiểm tra sớm. Mức ưu tiên là quy tắc vận hành của website, không phải kết luận chắc chắn từ một ảnh đơn lẻ.",
  },
  Tomato_Leaf_Mold: {
    vi_name: "Bệnh mốc lá",
    category: "Bệnh nấm",
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
    note: "Liên kết với IoT: nếu cảm biến ghi nhận độ ẩm không khí cao kéo dài, hệ thống có thể đưa ra cảnh báo “Điều kiện ẩm thuận lợi cho mốc lá” thay vì tự kết luận bệnh đã phát triển do độ ẩm cao.",
  },
  Tomato_Septoria_leaf_spot: {
    vi_name: "Bệnh đốm lá Septoria",
    category: "Bệnh nấm",
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
    note: "Không nên phân biệt Septoria với cháy lá sớm chỉ bằng một tiêu chí. Nếu ảnh không rõ hoặc triệu chứng chồng lấn, website nên đề nghị chụp thêm ảnh và kiểm tra thực tế.",
  },
  Tomato_Spider_mites_Two_spotted_spider_mite: {
    vi_name: "Nhện đỏ hai chấm",
    category: "Nhện hại / Sâu hại",
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
    note: "Đây là côn trùng/động vật gây hại chứ không phải bệnh nấm hay vi khuẩn. Cần hiển thị nhóm “Sâu hại” hoặc “Nhện hại” để tránh nhầm phương pháp xử lý.",
  },
  Tomato__Target_Spot: {
    vi_name: "Bệnh đốm vòng mục tiêu",
    category: "Bệnh nấm",
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
    note: "Vì Target Spot và Early Blight có thể có hình ảnh tương tự, không nên đưa ra hai phác đồ thuốc khác nhau chỉ dựa vào nhãn AI.",
  },
  Tomato__Tomato_YellowLeaf__Curl_Virus: {
    vi_name: "Bệnh xoăn vàng lá cà chua",
    category: "Bệnh virus · Mức ưu tiên: Cao",
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
    note: "Thuốc trừ nấm không chữa được bệnh do virus. Việc kiểm soát côn trùng môi giới giúp hạn chế lây lan nhưng không chữa khỏi cây đã nhiễm virus.",
  },
  Tomato__Tomato_mosaic_virus: {
    vi_name: "Bệnh khảm lá cà chua",
    category: "Bệnh virus · Mức ưu tiên: Cao",
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
    note: "Virus khảm lá không có biện pháp chữa khỏi cây đã nhiễm bằng thuốc trừ nấm. Khi xác nhận nhiễm, cần tập trung vào ngăn ngừa lây lan và xử lý cây bệnh theo hướng dẫn chuyên môn.",
  },
  Tomato_healthy: {
    vi_name: "Lá cà chua khỏe mạnh",
    category: "Chưa phát hiện dấu hiệu thuộc các lớp bệnh đã huấn luyện",
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
    note: "Chưa phát hiện dấu hiệu thuộc các lớp bệnh đã huấn luyện.",
  },
  Not_tomato: {
    vi_name: "Ảnh không phải lá cà chua",
    category: "Đầu vào không phải lá cà chua",
    signs: [
      "Ảnh đầu vào được mô hình phân loại vào lớp không phải cà chua.",
      "Đây là lớp từ chối đầu vào không phù hợp, không phải bệnh cây.",
    ],
    solutions: [
      "Ảnh có thể không phải lá cà chua hoặc chưa đủ điều kiện để phân tích.",
      "Tải ảnh mới, chụp một lá cà chua rõ nét, đủ sáng và không bị che khuất.",
      "Nếu ảnh thực sự là lá cà chua nhưng vẫn bị phân loại sai, lưu lại trường hợp để đánh giá mô hình.",
    ],
    note: "Không hiển thị tên bệnh hoặc hướng dẫn sử dụng thuốc cho lớp này. Một lớp Not_tomato không đảm bảo mô hình từ chối được mọi loại ảnh ngoài tập huấn luyện.",
  },
  "Không phải lá cà chua": {
    vi_name: "Ảnh không phải lá cà chua",
    category: "Đầu vào không phải lá cà chua",
    signs: [
      "Ảnh đầu vào được mô hình phân loại vào lớp không phải cà chua.",
      "Đây là lớp từ chối đầu vào không phù hợp, không phải bệnh cây.",
    ],
    solutions: [
      "Ảnh có thể không phải lá cà chua hoặc chưa đủ điều kiện để phân tích.",
      "Tải ảnh mới, chụp một lá cà chua rõ nét, đủ sáng và không bị che khuất.",
      "Nếu ảnh thực sự là lá cà chua nhưng vẫn bị phân loại sai, lưu lại trường hợp để đánh giá mô hình.",
    ],
    note: "Không hiển thị tên bệnh hoặc hướng dẫn sử dụng thuốc cho lớp này. Một lớp Not_tomato không đảm bảo mô hình từ chối được mọi loại ảnh ngoài tập huấn luyện.",
  },
  "Không chắc, cần chụp lại": {
    vi_name: "Chưa đủ độ tin cậy để kết luận",
    category: "Cần chụp lại ảnh",
    signs: [
      "Mức phân biệt giữa các lớp chưa đủ rõ ràng từ ảnh hiện tại.",
    ],
    solutions: [
      "Chụp lại lá cà chua rõ nét hơn, đủ ánh sáng tự nhiên và lấy rõ vùng tổn thương.",
      "Chụp cả mặt trên và mặt dưới lá nếu có dấu hiệu bất thường.",
    ],
    note: "Các bệnh đốm lá có thể có triệu chứng tương tự nhau nên cần kiểm tra thêm trên cây thật.",
  },
};

function loadSavedDiagnosis() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDiagnosisToStorage(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Bỏ qua nếu ảnh quá lớn vượt giới hạn localStorage
  }
}

function clearDiagnosisStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Bỏ qua lỗi lưu trữ
  }
}

function createCompactThumbnail(dataUrl, maxWidth = 480) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== "string") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function recordNewAiScan({
  prediction,
  confidence,
  viName,
  recommendation,
  imageDataUrl,
}) {
  if (!prediction) return;

  const compactImage = await createCompactThumbnail(imageDataUrl);
  const newScan = {
    scanId: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    prediction,
    viName: viName || "",
    confidence: confidence ?? null,
    recommendation: recommendation || "",
    image: compactImage,
  };

  try {
    const raw = localStorage.getItem(AI_SCANS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    const nextList = [...arr, newScan].slice(-100);
    localStorage.setItem(AI_SCANS_STORAGE_KEY, JSON.stringify(nextList));
  } catch {
    // Nếu vẫn vượt hạn mức localStorage, lưu bản không kèm ảnh để không mất lịch sử quét
    try {
      const raw = localStorage.getItem(AI_SCANS_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(list) ? list : [];
      const nextList = [...arr, { ...newScan, image: null }].slice(-100);
      localStorage.setItem(AI_SCANS_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // Bỏ qua nếu trình duyệt chặn ghi
    }
  }

  window.dispatchEvent(
    new CustomEvent("tomato-ai-scanned", { detail: newScan })
  );
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return await res.blob();
}

function buildAdviceObj(data, prediction) {
  const fallback = FALLBACK_ADVICE[prediction] || {};
  const apiAdvice = data?.advice;

  if (apiAdvice && typeof apiAdvice === "object") {
    return {
      vi_name: apiAdvice.vi_name || fallback.vi_name || "",
      category: apiAdvice.category || fallback.category || "",
      signs: Array.isArray(apiAdvice.signs) ? apiAdvice.signs : fallback.signs || [],
      solutions: Array.isArray(apiAdvice.solutions)
        ? apiAdvice.solutions
        : fallback.solutions || [],
      note:
        apiAdvice.note ||
        data.recommendation ||
        fallback.note ||
        "Các hướng xử lý là kiến thức canh tác tham khảo; cần kiểm tra thêm trên cây thật.",
    };
  }

  return {
    vi_name: fallback.vi_name || "",
    category: fallback.category || "",
    signs: fallback.signs || [],
    solutions: fallback.solutions || [],
    note:
      data.recommendation ||
      fallback.note ||
      "Các hướng xử lý là kiến thức canh tác tham khảo; cần kiểm tra thêm trên cây thật.",
  };
}

function normalizeResult(data) {
  const prediction =
    data.prediction ??
    data.class_name ??
    data.class ??
    data.label ??
    "Chưa xác định";

  const confidence =
    data.confidence ??
    data.probability ??
    data.score ??
    null;

  const rejected =
    Boolean(data.rejected) ||
    prediction === "Not_tomato" ||
    prediction === "Không phải lá cà chua" ||
    prediction === "Không chắc, cần chụp lại" ||
    prediction === "Chưa thể xác định";

  return {
    prediction,
    confidence,
    rejected,
    adviceObj: buildAdviceObj(data, prediction),
  };
}

function Diagnosis() {
  const saved = loadSavedDiagnosis();
  const fileInput = useRef(null);

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(saved?.fileName || "");
  const [preview, setPreview] = useState(saved?.preview || "");
  const [result, setResult] = useState(saved?.result || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    saveDiagnosisToStorage({
      fileName,
      preview,
      result,
    });
  }, [fileName, preview, result]);

  const handleFile = (selected) => {
    if (!selected) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selected.type)) {
      setError("Vui lòng chọn ảnh JPG, PNG hoặc WEBP.");
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("Ảnh phải nhỏ hơn 10 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setFile(selected);
      setFileName(selected.name);
      setPreview(dataUrl);
      setResult(null);
      setError("");
    };
    reader.readAsDataURL(selected);
  };

  const reset = () => {
    setFile(null);
    setFileName("");
    setPreview("");
    setResult(null);
    setError("");
    setLoading(false);
    clearDiagnosisStorage();

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  const runPrediction = async () => {
    if (!file && !preview) {
      setError("Bạn hãy chọn ảnh lá cà chua trước nhé!");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      if (file) {
        formData.append("image", file, file.name);
      } else if (preview) {
        const blob = await dataUrlToBlob(preview);
        formData.append("image", blob, fileName || "leaf.jpg");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Không thể dự đoán ảnh."
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const normalized = normalizeResult(data);
      setResult(normalized);
      saveDiagnosisToStorage({
        fileName,
        preview,
        result: normalized,
      });

      await recordNewAiScan({
        prediction: normalized.prediction,
        confidence: normalized.confidence,
        viName: normalized.adviceObj?.vi_name || "",
        recommendation:
          normalized.adviceObj?.note ||
          normalized.adviceObj?.solutions?.[0] ||
          "",
        imageDataUrl: preview,
      });
    } catch (err) {
      console.error("Prediction error:", err);

      setError(
        err.message?.includes("Failed to fetch")
          ? "Không kết nối được backend. Hãy kiểm tra Flask tại http://127.0.0.1:5000."
          : err.message || "Đã xảy ra lỗi khi dự đoán."
      );
    } finally {
      setLoading(false);
    }
  };

  const hasImage = Boolean(file || preview);
  const displayTitle = result?.adviceObj?.vi_name
    ? `${result.adviceObj.vi_name} (${result.prediction})`
    : result?.prediction || "";

  return (
    <div className="leaf-clinic">
      <div className="clinic-columns">
        <section className="clinic-card clinic-upload">
          <div className="clinic-card-header">
            <div className="clinic-icon pink">
              <ImagePlus size={21} />
            </div>

            <div>
              <h3>Hình ảnh chiếc lá</h3>
              <p>01 · Upload your leaf</p>
            </div>

            <span className="clinic-number">01</span>
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="clinic-file-input"
            onChange={(event) =>
              handleFile(event.target.files?.[0])
            }
          />

          <div
            className="clinic-image-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            {preview ? (
              <img
                className="clinic-preview"
                src={preview}
                alt="Ảnh lá đã chọn"
              />
            ) : (
              <div className="clinic-image-empty">
                <span className="clinic-leaf-emoji">🌿</span>

                <strong>Chiếc lá của bạn đâu rồi?</strong>

                <p>
                  Chọn một bức ảnh thật rõ nét
                  để bắt đầu nhé!
                </p>

                <small>JPG · PNG · WEBP · Tối đa 10 MB</small>
              </div>
            )}
          </div>

          <div className="clinic-file-info">
            <span title={fileName}>
              {fileName ? `📎 ${fileName}` : "Chưa có ảnh nào được chọn"}
            </span>

            {hasImage && (
              <button
                type="button"
                onClick={reset}
                aria-label="Xóa ảnh"
                disabled={loading}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>

          {error && (
            <div className="clinic-error" role="alert">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <div className="clinic-buttons">
            <button
              type="button"
              className="clinic-select-btn"
              onClick={() => fileInput.current?.click()}
              disabled={loading}
            >
              <UploadCloud size={18} />
              Chọn ảnh
            </button>

            <button
              type="button"
              className="clinic-analyze-btn"
              onClick={runPrediction}
              disabled={!hasImage || loading}
            >
              <ScanSearch size={18} />
              {loading ? "Đang phân tích..." : "Chẩn đoán bằng AI"}
            </button>
          </div>
        </section>

        {/* CỘT PHẢI: KẾT QUẢ */}
        <section className="clinic-card clinic-results">
          <div className="clinic-card-header">
            <div className="clinic-icon purple">
              <Sparkles size={21} />
            </div>

            <div>
              <h3>Kết quả chẩn đoán</h3>
              <p>02 · AI diagnosis</p>
            </div>

            <span className="clinic-number">02</span>
          </div>

          {!result ? (
            <div className="clinic-waiting">
              <div className="clinic-doctor">
                🍅
                <span>♡</span>
              </div>

              <h3>
                {loading
                  ? "Bác sĩ đang kiểm tra chiếc lá..."
                  : "Bác sĩ cà chua đã sẵn sàng!"}
              </h3>

              <p>
                {loading
                  ? "Hệ thống đang xử lý ảnh bằng mô hình AI. Vui lòng chờ một chút."
                  : "Chọn ảnh lá cà chua ở bên trái và nhấn chẩn đoán để xem kết quả thực tế."}
              </p>

              <div className="clinic-waiting-tag">
                <Heart size={15} />
                Taking care of every little leaf
              </div>
            </div>
          ) : (
            <div
              className="clinic-result-body"
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div
                className={`clinic-prediction ${
                  result.rejected ? "is-uncertain" : ""
                }`}
              >
                {result.rejected ? (
                  <AlertTriangle size={22} />
                ) : (
                  <CheckCircle2 size={22} />
                )}

                <div>
                  <small>KẾT QUẢ TỪ MÔ HÌNH AI</small>
                  <h4>{displayTitle}</h4>
                  {result.adviceObj?.category && (
                    <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.88 }}>
                      {result.adviceObj.category}
                    </p>
                  )}
                </div>
              </div>

              {result.adviceObj.signs.length > 0 && (
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
                    {result.adviceObj.signs.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: "3px" }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.adviceObj.solutions.length > 0 && (
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
                    {result.adviceObj.solutions.map((sol, idx) => (
                      <li key={idx} style={{ marginBottom: "3px" }}>
                        {sol}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="clinic-recommendation">
                <ShieldAlert size={19} style={{ flexShrink: 0 }} />

                <div>
                  <strong>Lưu ý & khuyến nghị tham khảo ♡</strong>
                  <p>{result.adviceObj.note}</p>
                </div>
              </div>
            </div>
          )}

          <div className="clinic-disclaimer">
            <Info size={15} />
            <span>
              Các hướng xử lý là kiến thức canh tác tham khảo theo IPM; bệnh đốm
              lá có thể có triệu chứng tương tự nhau nên cần kiểm tra thêm trên
              cây thật.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Diagnosis;