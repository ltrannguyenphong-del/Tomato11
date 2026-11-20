
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  ImagePlus,
  Sparkles,
  Heart,
  Leaf,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ScanSearch,
  Info,
} from "lucide-react";

import "../styles/diagnosis.css";

// Dữ liệu chỉ dùng để thử giao diện.
// KHÔNG phải kết quả dự đoán từ mô hình AI.
const demoCases = {
  healthy: {
    prediction: "Lá cà chua khỏe mạnh",
    confidence: 94.2,
    rejected: false,
    top3: [
      { name: "Healthy", value: 94.2 },
      { name: "Early blight", value: 3.8 },
      { name: "Late blight", value: 2.0 },
    ],
    advice:
      "Tiếp tục duy trì điều kiện chăm sóc phù hợp và theo dõi lá thường xuyên.",
  },
  late_blight: {
    prediction: "Bệnh mốc sương (Late blight)",
    confidence: 87.6,
    rejected: false,
    top3: [
      { name: "Late blight", value: 87.6 },
      { name: "Early blight", value: 8.9 },
      { name: "Leaf mold", value: 3.5 },
    ],
    advice:
      "Kiểm tra lại các triệu chứng, hạn chế lá bị ẩm kéo dài và tham khảo hướng dẫn phòng trừ phù hợp.",
  },
  rejected: {
    prediction: "Chưa thể xác định",
    confidence: 43.5,
    rejected: true,
    top3: [
      { name: "Không chắc chắn", value: 43.5 },
      { name: "Healthy", value: 31.0 },
      { name: "Late blight", value: 25.5 },
    ],
    advice:
      "Hãy chụp lại ảnh với ánh sáng tốt, lá rõ nét và ít vật thể che khuất.",
  },
};

const formatPercent = (value) => `${value.toFixed(1)}%`;

function Diagnosis() {
  const fileInput = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [demoCase, setDemoCase] = useState("healthy");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  };

  const runDemo = () => {
    if (!file) {
      setError("Bạn hãy chọn ảnh lá cà chua trước nhé!");
      return;
    }

    setError("");
    setResult(demoCases[demoCase]);
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
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>

          <div className="clinic-demo-selector">
            <label htmlFor="clinic-case">
              Tình huống minh họa
            </label>

            <select
              id="clinic-case"
              value={demoCase}
              onChange={(event) => {
                setDemoCase(event.target.value);
                setResult(null);
              }}
            >
              <option value="healthy">
                Lá khỏe mạnh
              </option>
              <option value="late_blight">
                Bệnh mốc sương
              </option>
              <option value="rejected">
                Kết quả không chắc chắn
              </option>
            </select>
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
            >
              <UploadCloud size={18} />
              Chọn ảnh
            </button>

            <button
              type="button"
              className="clinic-analyze-btn"
              onClick={runDemo}
              disabled={!file}
            >
              <ScanSearch size={18} />
              Xem kết quả mẫu
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
              <p>02 · AI diagnosis preview</p>
            </div>

            <span className="clinic-number">02</span>
          </div>

          {!result ? (
            <div className="clinic-waiting">
              <div className="clinic-doctor">
                🍅
                <span>♡</span>
              </div>

              <h3>Bác sĩ cà chua đã sẵn sàng!</h3>

              <p>
                Chọn ảnh và một tình huống minh họa
                ở bên trái để xem cách hiển thị kết quả.
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
                  <small>NHÃN KẾT QUẢ MINH HỌA</small>
                  <h4>{result.prediction}</h4>
                </div>
              </div>

              <div className="clinic-confidence">
                <div className="clinic-confidence-label">
                  <span>Độ tin cậy mẫu</span>
                  <strong>
                    {formatPercent(result.confidence)}
                  </strong>
                </div>

                <div className="clinic-confidence-track">
                  <div
                    style={{
                      width: `${result.confidence}%`,
                    }}
                  />
                </div>
              </div>

              <div className="clinic-top3">
                <h4>Top 3 dự đoán minh họa</h4>

                {result.top3.map((item, index) => (
                  <div
                    className="clinic-top3-row"
                    key={item.name}
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
              Đây là bản xem trước giao diện.
              Các kết quả mẫu không được tính toán từ ảnh
              và chưa phải kết quả của AI thật.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Diagnosis;
