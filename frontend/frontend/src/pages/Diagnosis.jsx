
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
} from "lucide-react";

import "../styles/diagnosis.css";

const API_URL = "http://127.0.0.1:5000/api/predict";

const formatPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0.0%";

  // Backend có thể trả xác suất dạng 0-1 hoặc phần trăm 0-100.
  const percent = number <= 1 ? number * 100 : number;
  return `${percent.toFixed(1)}%`;
};

const getAdvice = (prediction, rejected) => {
  if (rejected) {
    return "Ảnh chưa đủ điều kiện để đưa ra kết luận đáng tin cậy. Hãy chụp lại lá rõ nét, đủ sáng và đặt lá trong khung hình.";
  }

  if (prediction === "Not_tomato") {
    return "Ảnh có thể không phải lá cà chua. Hãy chụp rõ một chiếc lá cà chua và thử lại.";
  }

  if (prediction.toLowerCase().includes("healthy")) {
    return "Lá được nhận diện là khỏe mạnh. Hãy tiếp tục duy trì điều kiện chăm sóc phù hợp và theo dõi thường xuyên.";
  }

  return "Hãy kiểm tra kỹ các triệu chứng trên lá, theo dõi diễn biến bệnh và tham khảo hướng dẫn phòng trừ phù hợp.";
};

function normalizeResult(data) {
  const prediction =
    data.prediction ??
    data.class_name ??
    data.class ??
    data.label ??
    "Chưa xác định";

  const confidence = Number(
    data.confidence ?? data.probability ?? 0
  );

  const rawTop3 = data.top3 ?? data.top_3 ?? [];

  const top3 = rawTop3.map((item) => ({
    name:
      item.name ??
      item.class_name ??
      item.class ??
      item.label ??
      "Unknown",
    value: Number(
      item.value ??
      item.confidence ??
      item.probability ??
      0
    ),
  }));

  const rejected =
    Boolean(data.rejected) ||
    prediction === "Not_tomato" ||
    prediction === "Chưa thể xác định";

  return {
    prediction,
    confidence,
    rejected,
    top3,
    advice: data.advice || getAdvice(prediction, rejected),
  };
}

function Diagnosis() {
  const fileInput = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

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

    setFile(selected);
    setResult(null);
    setError("");
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setLoading(false);

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  const runPrediction = async () => {
    if (!file) {
      setError("Bạn hãy chọn ảnh lá cà chua trước nhé!");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      // Tên trường phải khớp với request.files.get("image") ở Flask.
      formData.append("image", file);

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

      setResult(normalizeResult(data));
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

  return (
    <div className="leaf-clinic">
      <section className="clinic-banner">
        <div className="clinic-banner-text">
          <span className="clinic-kicker">
            ♡ TOMATO LEAF CLINIC ♡
          </span>

          <h2>
            Bác sĩ lá cà chua
            <span className="clinic-heart"> ♡</span>
          </h2>

          <p>
            Một góc nhỏ giúp chăm sóc sức khỏe
            những chiếc lá trong khu vườn.
          </p>
        </div>

        <div className="clinic-banner-decoration">
          <span className="clinic-tomato">🍅</span>
          <span className="clinic-flower">✿</span>
        </div>
      </section>

      <div className="clinic-columns">
        {/* CỘT TRÁI: TẢI ẢNH */}
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
                  Chọn một bức ảnh thật xinh
                  để bắt đầu nhé!
                </p>

                <small>JPG · PNG · WEBP · Tối đa 10 MB</small>
              </div>
            )}
          </div>

          <div className="clinic-file-info">
            <span title={file?.name}>
              {file ? `📎 ${file.name}` : "Chưa có ảnh nào được chọn"}
            </span>

            {file && (
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
              disabled={!file || loading}
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
            <div className="clinic-result-body">
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
                  <h4>{result.prediction}</h4>
                </div>
              </div>

              <div className="clinic-confidence">
                <div className="clinic-confidence-label">
                  <span>Độ tin cậy</span>
                  <strong>
                    {formatPercent(result.confidence)}
                  </strong>
                </div>

                <div className="clinic-confidence-track">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          result.confidence <= 1
                            ? result.confidence * 100
                            : result.confidence
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="clinic-top3">
                <h4>Top 3 dự đoán</h4>

                {result.top3.map((item, index) => (
                  <div
                    className="clinic-top3-row"
                    key={`${item.name}-${index}`}
                  >
                    <span className="clinic-rank">
                      {index + 1}
                    </span>

                    <span className="clinic-class">
                      {item.name}
                    </span>

                    <strong>
                      {formatPercent(item.value)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="clinic-recommendation">
                <Heart size={19} />

                <div>
                  <strong>Lời nhắn chăm sóc ♡</strong>
                  <p>{result.advice}</p>
                </div>
              </div>
            </div>
          )}

          <div className="clinic-disclaimer">
            <Info size={15} />
            <span>
              Kết quả được xử lý từ ảnh tải lên bằng mô hình AI.
              Độ chính xác phụ thuộc vào chất lượng ảnh và dữ liệu huấn luyện.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Diagnosis;
