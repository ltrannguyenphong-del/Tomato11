
import json
import sqlite3
from pathlib import Path

from backend.config import Config


# ==========================================
# 1. CAU HINH DATABASE
# ==========================================

DB_PATH = Path(Config.DATABASE_PATH)


# ==========================================
# 2. KET NOI SQLITE
# ==========================================

def get_connection():
    """
    Tao ket noi SQLite.
    Moi request su dung ket noi rieng.
    """

    DB_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    conn = sqlite3.connect(
        str(DB_PATH),
        timeout=10
    )

    conn.row_factory = sqlite3.Row

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")

    return conn


# ==========================================
# 3. KHOI TAO DATABASE - BE-03
# ==========================================

def init_db():
    """
    Tao bang lich su nhan dien neu chua co.
    Khong xoa du lieu cu.
    """

    with get_connection() as conn:

        conn.execute("""
            CREATE TABLE IF NOT EXISTS prediction_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                filename TEXT NOT NULL,

                image_path TEXT,

                predicted_label TEXT NOT NULL,

                confidence REAL NOT NULL
                    CHECK (
                        confidence >= 0
                        AND confidence <= 1
                    ),

                top1_label TEXT NOT NULL,

                top3_json TEXT NOT NULL DEFAULT '[]',

                is_rejected INTEGER NOT NULL DEFAULT 0
                    CHECK (is_rejected IN (0, 1)),

                created_at TEXT NOT NULL
                    DEFAULT (
                        strftime(
                            '%Y-%m-%dT%H:%M:%fZ',
                            'now'
                        )
                    )
            )
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_prediction_history_created_at
            ON prediction_history(created_at DESC, id DESC)
        """)

        conn.commit()

    print("SQLite database da khoi tao thanh cong!")
    print(f"Database: {DB_PATH}")


# ==========================================
# 4. LUU LICH SU NHAN DIEN - BE-04
# ==========================================

def save_prediction(filename, image_path, result):
    """
    Luu ket qua AI vao SQLite.

    Tra ve:
        history_id
    """

    with get_connection() as conn:

        cursor = conn.execute("""
            INSERT INTO prediction_history (
                filename,
                image_path,
                predicted_label,
                confidence,
                top1_label,
                top3_json,
                is_rejected
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            filename,
            str(image_path),
            result["prediction"],
            float(result["confidence"]),
            result["top1_label"],
            json.dumps(
                result["top3"],
                ensure_ascii=False
            ),
            int(result["is_rejected"])
        ))

        conn.commit()

        return cursor.lastrowid


# ==========================================
# 5. CHUYEN SQLITE ROW THANH DICTIONARY
# ==========================================

def serialize_history(row):
    """
    Chuyen mot ban ghi SQLite thanh JSON.
    Khong tra ve duong dan noi bo image_path.
    """

    item = dict(row)

    item.pop("image_path", None)

    item["top3"] = json.loads(
        item.pop("top3_json")
    )

    item["is_rejected"] = bool(
        item["is_rejected"]
    )

    return item


# ==========================================
# 6. DANH SACH LICH SU - BE-05
# ==========================================

def get_history(page=1, per_page=10, sort="desc"):
    """
    Lay danh sach lich su.

    page:
        Trang hien tai, bat dau tu 1.

    per_page:
        So ban ghi moi trang, toi da 100.

    sort:
        asc hoac desc.
    """

    page = int(page)
    per_page = int(per_page)

    if page < 1:
        raise ValueError("page phai >= 1")

    if not 1 <= per_page <= 100:
        raise ValueError("per_page phai tu 1 den 100")

    if sort not in ("asc", "desc"):
        raise ValueError("sort phai la asc hoac desc")

    offset = (page - 1) * per_page

    order = (
        "ASC" if sort == "asc"
        else "DESC"
    )

    with get_connection() as conn:

        total = conn.execute("""
            SELECT COUNT(*)
            FROM prediction_history
        """).fetchone()[0]

        rows = conn.execute(f"""
            SELECT
                id,
                filename,
                predicted_label,
                confidence,
                top1_label,
                top3_json,
                is_rejected,
                created_at
            FROM prediction_history
            ORDER BY created_at {order}, id {order}
            LIMIT ? OFFSET ?
        """, (
            per_page,
            offset
        )).fetchall()

    items = [
        serialize_history(row)
        for row in rows
    ]

    total_pages = (
        total + per_page - 1
    ) // per_page

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "sort": sort
    }


# ==========================================
# 7. CHI TIET LICH SU - BE-05
# ==========================================

def get_history_detail(history_id):
    """
    Lay mot ban ghi theo ID.
    Tra ve None neu khong ton tai.
    """

    with get_connection() as conn:

        row = conn.execute("""
            SELECT
                id,
                filename,
                predicted_label,
                confidence,
                top1_label,
                top3_json,
                is_rejected,
                created_at
            FROM prediction_history
            WHERE id = ?
        """, (
            history_id,
        )).fetchone()

    if row is None:
        return None

    return serialize_history(row)


# ==========================================
# 8. KIEM TRA DATABASE
# ==========================================

def check_db():

    with get_connection() as conn:

        tables = conn.execute("""
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
        """).fetchall()

        total = conn.execute("""
            SELECT COUNT(*)
            FROM prediction_history
        """).fetchone()[0]

    print("\nDanh sach bang:")

    for table in tables:
        print("-", table["name"])

    print(f"\nTong ban ghi lich su: {total}")


if __name__ == "__main__":
    init_db()
    check_db()
