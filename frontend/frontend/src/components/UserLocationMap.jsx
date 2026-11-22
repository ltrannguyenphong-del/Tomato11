import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, LocateFixed, Navigation } from "lucide-react";

const FALLBACK_COORDS = [16.0544, 108.2022]; // Đà Nẵng (dự phòng khi chưa cấp quyền GPS)

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&accept-language=vi`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!res.ok) throw new Error("Geocode failed");
    const data = await res.json();

    const addr = data?.address || {};
    const ward =
      addr.suburb ||
      addr.quarter ||
      addr.neighbourhood ||
      addr.ward ||
      addr.city_district ||
      "Không rõ phường";
    const city =
      addr.city ||
      addr.town ||
      addr.province ||
      addr.state ||
      "Không rõ thành phố";

    return `${ward}, ${city}`;
  } catch {
    return null;
  }
}

export default function UserLocationMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState(null);
  const [statusText, setStatusText] = useState("Đang lấy vị trí hiện tại...");
  const [locationLabel, setLocationLabel] = useState(
    "Đang xác định phường và thành phố..."
  );
  const [isFallback, setIsFallback] = useState(false);

  const fetchWardAndCity = async (lat, lon) => {
    setLocationLabel("Đang xác định phường và thành phố...");
    const resolved = await reverseGeocode(lat, lon);
    if (resolved) {
      setLocationLabel(resolved);
    } else {
      setLocationLabel(
        `Không rõ phường & thành phố (${lat.toFixed(5)}, ${lon.toFixed(5)})`
      );
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      const [lat, lon] = FALLBACK_COORDS;
      setCoords(FALLBACK_COORDS);
      setIsFallback(true);
      setStatusText(
        "Trình duyệt không hỗ trợ định vị — hiển thị vị trí mặc định"
      );
      fetchWardAndCity(lat, lon);
      return;
    }

    setStatusText("Đang định vị GPS/mạng...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords([latitude, longitude]);
        setIsFallback(false);
        setStatusText(
          `Vĩ độ: ${latitude.toFixed(5)}, Kinh độ: ${longitude.toFixed(5)} (±${Math.round(
            accuracy
          )}m)`
        );
        fetchWardAndCity(latitude, longitude);
      },
      () => {
        const [lat, lon] = FALLBACK_COORDS;
        setCoords(FALLBACK_COORDS);
        setIsFallback(true);
        setStatusText("Chưa cấp quyền vị trí — đang dùng tọa độ tham khảo");
        fetchWardAndCity(lat, lon);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || !coords) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: coords,
        zoom: 16,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.circleMarker(coords, {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#e11d48",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup("Vị trí hiện tại của bạn")
        .openPopup();

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView(coords, 16);
      markerRef.current?.setLatLng(coords);
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  }, [coords]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}
    >
      <div
        className="cute-section-title"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: 0,
        }}
      >
        <div>
          <h3
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: 0,
            }}
          >
            <MapPin size={18} />
            <span>Vị trí hiện tại</span>
          </h3>
          <p style={{ margin: "4px 0 0" }}>{statusText}</p>
        </div>

        <button
          type="button"
          onClick={requestLocation}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          <LocateFixed size={15} />
          <span>{isFallback ? "Thử lại định vị" : "Cập nhật vị trí"}</span>
        </button>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "300px",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 14px",
          borderRadius: "14px",
          background: "#fff8fa",
          border: "1px solid #fde2e8",
        }}
      >
        <Navigation
          size={17}
          style={{ flexShrink: 0, color: "#e11d48" }}
        />
        <div style={{ fontSize: "13.5px", lineHeight: 1.45 }}>
          <strong style={{ marginRight: "6px" }}>Phường & Thành phố:</strong>
          <span>{locationLabel}</span>
        </div>
      </div>
    </div>
  );
}