
import csv
import time
from datetime import datetime
from pathlib import Path

import serial

# ===== CAU HINH ESP32 =====
SERIAL_PORT = "COM6"
BAUD_RATE = 115200
SAMPLE_INTERVAL = 5

# ===== THU MUC LUU DU LIEU =====
DATA_DIR = Path(r"D:\dowload\Final year\AI\tomato")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Moi lan chay tao mot file CSV moi
filename = DATA_DIR / (
    "tomato_sensors_"
    + datetime.now().strftime("%Y%m%d_%H%M%S")
    + ".csv"
)

try:
    with serial.Serial(
        SERIAL_PORT, BAUD_RATE, timeout=2
    ) as ser:

        # Cho ESP32 on dinh sau khi mo cong Serial
        time.sleep(2)
        ser.reset_input_buffer()

        with open(
            filename, "w", newline="", encoding="utf-8"
        ) as file:

            writer = csv.writer(file)

            # Tieu de cac cot CSV
            writer.writerow([
                "timestamp",
                "temperature_C",
                "humidity_percent",
                "soil_adc",
                "light_lux"
            ])
            file.flush()

            print("Da ket noi ESP32 tai", SERIAL_PORT)
            print("Dang luu du lieu vao:")
            print(filename)
            print("Chu ky luu: 5 giay")
            print("Nhan Ctrl+C de dung thu thap.\n")

            last_saved = 0.0
            total_saved = 0

            while True:
                line = ser.readline().decode(
                    "utf-8", errors="ignore"
                ).strip()

                # Chi xu ly dong DATA
                if not line.startswith("DATA,"):
                    continue

                parts = line.split(",")

                if len(parts) != 5:
                    continue

                try:
                    temperature = float(parts[1])
                    humidity = float(parts[2])
                    soil_adc = int(parts[3])
                    light_lux = float(parts[4])
                except ValueError:
                    continue

                # Kiem tra du lieu hop le
                if not (
                    -40 <= temperature <= 80
                    and 0 <= humidity <= 100
                    and 0 <= soil_adc <= 4095
                    and light_lux >= 0
                ):
                    continue

                now = time.monotonic()

                # Luu toi da mot mau moi moi 5 giay
                if now - last_saved < SAMPLE_INTERVAL:
                    continue

                timestamp = datetime.now().astimezone().isoformat(
                    timespec="seconds"
                )

                writer.writerow([
                    timestamp,
                    temperature,
                    humidity,
                    soil_adc,
                    light_lux
                ])

                # Day du lieu xuong file ngay
                file.flush()

                last_saved = now
                total_saved += 1

                print(
                    f"[{total_saved}] {timestamp} | "
                    f"Nhiet do: {temperature:.2f} C | "
                    f"Do am khong khi: {humidity:.2f}% | "
                    f"ADC dat: {soil_adc} | "
                    f"Anh sang: {light_lux:.2f} lux"
                )

except KeyboardInterrupt:
    print("\nDa dung thu thap du lieu.")

except serial.SerialException as error:
    print("\nLoi Serial:", error)
    print("Kiem tra COM6 va dong Serial Monitor trong Arduino IDE.")

finally:
    print("Ket thuc chuong trinh.")
