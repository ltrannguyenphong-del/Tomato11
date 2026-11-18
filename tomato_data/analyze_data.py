
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

# Thu muc chua cac file CSV
DATA_DIR = Path(r"D:\dowload\Final year\AI\tomato")

# Tim file CSV moi nhat
csv_files = list(DATA_DIR.glob("tomato_sensors_*.csv"))

if not csv_files:
    print("Khong tim thay file CSV!")
    raise SystemExit

csv_file = max(csv_files, key=lambda p: p.stat().st_mtime)

print("File dang phan tich:", csv_file.name)

# Doc du lieu
df = pd.read_csv(csv_file)

# Chuyen doi kieu du lieu
df["timestamp"] = pd.to_datetime(
    df["timestamp"], errors="coerce"
)

columns = [
    "temperature_C",
    "humidity_percent",
    "soil_adc",
    "light_lux"
]

for col in columns:
    df[col] = pd.to_numeric(df[col], errors="coerce")

# Bao cao chat luong du lieu
print("\n===== TONG QUAN DU LIEU =====")
print("So mau:", len(df))
print("So cot:", len(df.columns))
print("\nSo gia tri thieu:")
print(df.isna().sum())

print("\n===== THONG KE CAM BIEN =====")
print(df[columns].describe().round(2))

print("\nSo dong trung lap:", df.duplicated().sum())

# Loai cac dong thieu du lieu can thiet de ve bieu do
plot_df = df.dropna(subset=["timestamp"] + columns)
plot_df = plot_df.sort_values("timestamp")

if plot_df.empty:
    print("Khong co du lieu hop le de ve bieu do.")
    raise SystemExit

# Ve 4 bieu do
fig, axes = plt.subplots(2, 2, figsize=(13, 8))

charts = [
    ("temperature_C", "Nhiet do (°C)"),
    ("humidity_percent", "Do am khong khi (%)"),
    ("soil_adc", "ADC cam bien do am dat"),
    ("light_lux", "Cuong do anh sang (lux)")
]

for ax, (col, title) in zip(axes.flat, charts):
    ax.plot(plot_df["timestamp"], plot_df[col])
    ax.set_title(title)
    ax.set_xlabel("Thoi gian")
    ax.grid(True, alpha=0.3)
    ax.tick_params(axis="x", rotation=30)

fig.tight_layout()

# Luu bieu do vao thu muc du an
output_file = DATA_DIR / "tomato_sensor_charts.png"
fig.savefig(output_file, dpi=150, bbox_inches="tight")

print("\nDa luu bieu do tai:", output_file)
plt.show()
