
import unittest
from pathlib import Path
from io import BytesIO

from backend.app import app

BASE_DIR = Path(__file__).resolve().parent


class TestTomatoBackend(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()

    # BE-01: Health check
    def test_01_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertEqual(data["status"], "ok")

    # BE-02: Khong gui anh
    def test_02_missing_image(self):
        response = self.client.post("/api/predict")
        self.assertEqual(response.status_code, 400)

    # BE-02: Dinh dang khong hop le
    def test_03_invalid_extension(self):
        response = self.client.post(
            "/api/predict",
            data={
                "image": (
                    BytesIO(b"invalid content"),
                    "test.txt"
                )
            },
            content_type="multipart/form-data"
        )
        self.assertEqual(response.status_code, 400)

    # BE-05: Lay danh sach lich su
    def test_04_history_list(self):
        response = self.client.get("/api/history")
        self.assertEqual(response.status_code, 200)

        data = response.get_json()
        self.assertTrue(data["success"])
        self.assertIn("items", data)
        self.assertIn("total", data)

    # BE-05: Tham so phan trang khong hop le
    def test_05_invalid_page(self):
        response = self.client.get(
            "/api/history?page=0"
        )
        self.assertEqual(response.status_code, 400)

    # BE-05: ID khong ton tai
    def test_06_history_not_found(self):
        response = self.client.get(
            "/api/history/99999999"
        )
        self.assertEqual(response.status_code, 404)

    # BE-02 + BE-04: Nhan dien va luu lich su
    def test_07_predict_and_save(self):
        image_path = BASE_DIR / "anh_that" / "anht4.jpg"

        if not image_path.exists():
            self.skipTest("Khong tim thay anh test")

        with open(image_path, "rb") as f:
            response = self.client.post(
                "/api/predict",
                data={
                    "image": (f, "anht4.jpg")
                },
                content_type="multipart/form-data"
            )

        self.assertEqual(response.status_code, 200)

        result = response.get_json()

        self.assertTrue(result["success"])
        self.assertIn("prediction", result)
        self.assertIn("confidence", result)
        self.assertIn("history_id", result)

        history_id = result["history_id"]

        detail = self.client.get(
            f"/api/history/{history_id}"
        )

        self.assertEqual(detail.status_code, 200)

        history = detail.get_json()["data"]

        self.assertEqual(
            history["predicted_label"],
            result["prediction"]
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
