import { useMemo, useState } from "react";
import { Camera, Send, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `http://${window.location.hostname}:5000`;

async function compressImageToDataUrl(file, maxSide = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width >= height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function MobileSnap() {
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("session") || "garden-01").trim();
  }, []);

  const [previewUrl, setPreviewUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // { type: "ok" | "err", text: string }

  const handleCaptureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    try {
      const compressed = await compressImageToDataUrl(file);
      setPreviewUrl(compressed);
      setImageDataUrl(compressed);
    } catch {
      setStatus({ type: "err", text: "Không đọc được ảnh từ camera." });
    }
  };

  const handleSendPhoto = async () => {
    if (!imageDataUrl || sending) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/remote-photo?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, image: imageDataUrl }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setStatus({
        type: "ok",
        text: "Đã gửi ảnh lên trang Chẩn đoán AI trên laptop!",
      });
    } catch (err) {
      setStatus({
        type: "err",
        text: `Gửi ảnh thất bại: ${err.message}`,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f4f7fa",
        padding: "20px 16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 4px 18px rgba(36, 54, 70, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "19px", color: "#243646" }}>
            Chụp lá cà chua gửi lên web
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#6d8090" }}>
            Phiên kết nối: <strong>{sessionId}</strong>
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "#eaf2f8",
            color: "#326d9b",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <Camera size={18} />
          <span>Mở camera điện thoại</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCaptureChange}
            style={{ display: "none" }}
          />
        </label>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Ảnh lá vừa chụp"
            style={{
              width: "100%",
              maxHeight: "320px",
              objectFit: "contain",
              borderRadius: "12px",
              border: "1px solid #e1e7ee",
              background: "#0f172a",
            }}
          />
        )}

        <button
          type="button"
          disabled={!imageDataUrl || sending}
          onClick={handleSendPhoto}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 16px",
            borderRadius: "12px",
            border: "none",
            background: !imageDataUrl || sending ? "#94a3b8" : "#28785b",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "14px",
            cursor: !imageDataUrl || sending ? "not-allowed" : "pointer",
          }}
        >
          <Send size={16} />
          <span>{sending ? "Đang gửi ảnh..." : "Gửi lên web"}</span>
        </button>

        {status && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              background: status.type === "ok" ? "#edf7f2" : "#fceded",
              color: status.type === "ok" ? "#28785b" : "#b54949",
            }}
          >
            {status.type === "ok" ? (
              <CheckCircle2 size={17} />
            ) : (
              <AlertCircle size={17} />
            )}
            <span>{status.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}