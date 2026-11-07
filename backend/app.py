
import logging
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request
from flask_cors import CORS
from PIL import Image, UnidentifiedImageError
from werkzeug.utils import secure_filename

from backend.config import Config
from backend.database import (
    init_db,
    save_prediction,
    get_history,
    get_history_detail
)
from infer import predict_result


# ==========================================
# 1. CAU HINH
# ==========================================

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


# ==========================================
# 2. KHOI TAO FLASK - BE-01
# ==========================================

def create_app():

    app = Flask(__name__)
    app.config.from_object(Config)

    # Tao thu muc luu anh
    upload_folder = Path(
        app.config["UPLOAD_FOLDER"]
    )

    upload_folder.mkdir(
        parents=True,
        exist_ok=True
    )

    # Khoi tao SQLite
    init_db()

    # Cau hinh CORS cho Frontend
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
            ]
        }
    })

    # ======================================
    # 3. TRANG CHU - BE-01
    # ======================================

    @app.route("/", methods=["GET"])
    def home():

        return jsonify({
            "success": True,
            "project": "Tomato11",
            "message": "Backend Flask dang hoat dong",
            "status": "ok"
        }), 200

    # ======================================
    # 4. HEALTH CHECK - BE-01
    # ======================================

    @app.route("/api/health", methods=["GET"])
    def health():

        return jsonify({
            "status": "ok",
            "service": "Tomato11 Backend",
            "version": "1.0.0"
        }), 200

    # ======================================
    # 5. API NHAN DIEN - BE-02, BE-04
    # ======================================

    @app.route("/predict", methods=["POST"])
    @app.route("/api/predict", methods=["POST"])
    def predict_image():

        # Kiem tra co file upload
        if "image" not in request.files:
            return jsonify({
                "success": False,
                "error": "Chua gui file anh"
            }), 400

        file = request.files["image"]

        if not file.filename:
            return jsonify({
                "success": False,
                "error": "Chua chon anh"
            }), 400

        # Kiem tra dinh dang
        extension = Path(
            file.filename
        ).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            return jsonify({
                "success": False,
                "error": "Chi ho tro JPG, JPEG, PNG"
            }), 400

        saved_path = None

        try:

            # Doc du lieu anh
            image_bytes = file.read()

            if not image_bytes:
                return jsonify({
                    "success": False,
                    "error": "File anh rong"
                }), 400

            # Kiem tra noi dung anh
            with Image.open(
                BytesIO(image_bytes)
            ) as check:

                if check.format not in ("JPEG", "PNG"):
                    return jsonify({
                        "success": False,
                        "error": "Noi dung anh khong hop le"
                    }), 400

                check.verify()

            # Mo lai anh va chay AI
            with Image.open(
                BytesIO(image_bytes)
            ) as image:

                image.load()

                result = predict_result(image)

            # ==================================
            # BE-04: LUU ANH
            # ==================================

            safe_name = secure_filename(
                file.filename
            )

            if not safe_name:
                safe_name = "image" + extension

            stored_name = (
                f"{uuid4().hex}_{safe_name}"
            )

            saved_path = (
                upload_folder / stored_name
            )

            saved_path.write_bytes(image_bytes)

            # ==================================
            # BE-04: LUU SQLITE
            # ==================================

            try:

                history_id = save_prediction(
                    filename=file.filename,
                    image_path=saved_path,
                    result=result
                )

            except Exception:

                # Neu luu SQLite loi thi xoa anh
                saved_path.unlink(missing_ok=True)
                raise

            # ==================================
            # TRA KET QUA CHO FRONTEND
            # ==================================

            return jsonify({
                "success": True,
                "history_id": history_id,
                "filename": file.filename,
                "prediction": result["prediction"],
                "confidence": result["confidence"],
                "top1_label": result["top1_label"],
                "top1_confidence": result["top1_confidence"],
                "is_rejected": result["is_rejected"],
                "top3": result["top3"]
            }), 200

        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
            Image.DecompressionBombError
        ):

            return jsonify({
                "success": False,
                "error": "Anh bi loi hoac khong hop le"
            }), 400

        except Exception:

            logging.exception(
                "Loi nhan dien hoac luu lich su"
            )

            return jsonify({
                "success": False,
                "error": "Khong the xu ly anh"
            }), 500

    # ======================================
    # 6. API DANH SACH LICH SU - BE-05
    # ======================================

    @app.route(
        "/api/history",
        methods=["GET"]
    )
    def history_list():

        try:

            page = int(
                request.args.get("page", 1)
            )

            per_page = int(
                request.args.get("per_page", 10)
            )

            sort = request.args.get(
                "sort", "desc"
            ).lower()

            # Kiem tra tham so
            if page < 1 or not 1 <= per_page <= 100:
                return jsonify({
                    "success": False,
                    "error": "page hoac per_page khong hop le"
                }), 400

            if sort not in ("asc", "desc"):
                return jsonify({
                    "success": False,
                    "error": "sort phai la asc hoac desc"
                }), 400

            # Doc SQLite
            data = get_history(
                page=page,
                per_page=per_page,
                sort=sort
            )

            return jsonify({
                "success": True,
                **data
            }), 200

        except ValueError:

            return jsonify({
                "success": False,
                "error": "Tham so truy van khong hop le"
            }), 400

        except Exception:

            app.logger.exception(
                "Loi lay danh sach lich su"
            )

            return jsonify({
                "success": False,
                "error": "Khong the doc lich su"
            }), 500

    # ======================================
    # 7. API CHI TIET LICH SU - BE-05
    # ======================================

    @app.route(
        "/api/history/<int:history_id>",
        methods=["GET"]
    )
    def history_detail(history_id):

        try:

            result = get_history_detail(
                history_id
            )

            if result is None:
                return jsonify({
                    "success": False,
                    "error": "Khong tim thay lich su"
                }), 404

            return jsonify({
                "success": True,
                "data": result
            }), 200

        except Exception:

            app.logger.exception(
                "Loi lay chi tiet lich su"
            )

            return jsonify({
                "success": False,
                "error": "Khong the doc chi tiet lich su"
            }), 500

    # ======================================
    # 8. XU LY LOI DUNG LUONG
    # ======================================

    @app.errorhandler(413)
    def file_too_large(error):

        return jsonify({
            "success": False,
            "error": "Dung luong request vuot qua 10MB"
        }), 413

    # ======================================
    # PHAI DAT SAU TAT CA CAC ROUTE
    # ======================================

    return app


# ==========================================
# 9. KHOI TAO UNG DUNG
# ==========================================

app = create_app()


# ==========================================
# 10. CHAY BACKEND
# ==========================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
