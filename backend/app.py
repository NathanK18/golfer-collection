from __future__ import annotations

import json
import os
import time
import uuid
from threading import Lock
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Allow host to override where JSON is stored
DATA_DIR = os.environ.get("DATA_DIR") or os.path.join(BASE_DIR, "data")
DATA_DIR = os.path.abspath(os.path.expanduser(DATA_DIR))
DATA_FILE = os.path.join(DATA_DIR, "golfers.json")

PAGE_SIZE = 10

app = Flask(__name__)
CORS(app)

_lock = Lock()

# -----------------------------
# Frontend serving (single-domain app)
# -----------------------------
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")


@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    return send_from_directory(ASSETS_DIR, filename)


# -----------------------------
# Helpers
# -----------------------------
def _now_ms() -> int:
    return int(time.time() * 1000)


def _seed_records() -> List[Dict[str, Any]]:
    """Starter data: minimum 30 records."""
    now = _now_ms()

    def mk(
        name: str,
        country: str,
        age: int,
        world_rank: int,
        wins_pga: int,
        major_wins: int,
        fedex_rank: Optional[int],
    ):
        return {
            "id": f"g_{uuid.uuid4().hex}",
            "name": name,
            "country": country,
            "age": age,
            "worldRank": world_rank,
            "winsPga": wins_pga,
            "majorWins": major_wins,
            "fedexRank": fedex_rank,
            "updatedAt": now,
        }

    return [
        mk("Scottie Scheffler", "USA", 27, 1, 9, 2, 1),
        mk("Rory McIlroy", "NIR", 34, 2, 24, 4, 6),
        mk("Jon Rahm", "ESP", 29, 3, 11, 2, 9),
        mk("Xander Schauffele", "USA", 30, 4, 7, 0, 3),
        mk("Viktor Hovland", "NOR", 26, 5, 6, 0, 2),
        mk("Patrick Cantlay", "USA", 31, 6, 8, 0, 7),
        mk("Collin Morikawa", "USA", 27, 7, 6, 2, 10),
        mk("Ludvig Åberg", "SWE", 24, 8, 1, 0, 14),
        mk("Justin Thomas", "USA", 30, 9, 15, 2, 18),
        mk("Jordan Spieth", "USA", 30, 10, 13, 3, 22),
        mk("Brooks Koepka", "USA", 33, 11, 9, 5, 30),
        mk("Dustin Johnson", "USA", 39, 12, 24, 2, 40),
        mk("Max Homa", "USA", 33, 13, 6, 0, 15),
        mk("Tony Finau", "USA", 34, 14, 6, 0, 16),
        mk("Tommy Fleetwood", "ENG", 32, 15, 0, 0, 19),
        mk("Cameron Smith", "AUS", 30, 16, 6, 1, 25),
        mk("Hideki Matsuyama", "JPN", 31, 17, 9, 1, 20),
        mk("Wyndham Clark", "USA", 30, 18, 3, 1, 8),
        mk("Matt Fitzpatrick", "ENG", 29, 19, 2, 1, 24),
        mk("Tyrrell Hatton", "ENG", 32, 20, 1, 0, 27),
        mk("Jason Day", "AUS", 36, 21, 13, 1, 35),
        mk("Bryson DeChambeau", "USA", 30, 22, 8, 1, 29),
        mk("Sungjae Im", "KOR", 25, 23, 2, 0, 17),
        mk("Sam Burns", "USA", 27, 24, 5, 0, 21),
        mk("Shane Lowry", "IRL", 36, 25, 2, 1, 26),
        mk("Keegan Bradley", "USA", 37, 26, 6, 1, 23),
        mk("Justin Rose", "ENG", 43, 27, 11, 1, 38),
        mk("Rickie Fowler", "USA", 35, 28, 6, 0, 33),
        mk("Corey Conners", "CAN", 32, 29, 2, 0, 28),
        mk("Sepp Straka", "AUT", 30, 30, 2, 0, 31),
    ]


def _ensure_datafile() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(_seed_records(), f, ensure_ascii=False, indent=2)
        return

    # ensure at least 30 records
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("golfers.json is not a list")
    except Exception:
        data = []

    if len(data) < 30:
        seed = _seed_records()
        data = data + seed[: max(0, 30 - len(data))]
        _write_all(data)


def _read_all() -> List[Dict[str, Any]]:
    _ensure_datafile()
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data if isinstance(data, list) else []


def _write_all(records: List[Dict[str, Any]]) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DATA_FILE)


def _sorted(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return sorted(records, key=lambda r: int(r.get("worldRank") or 10**9))


def _error(status: int, message: str, details: Optional[List[str]] = None):
    payload: Dict[str, Any] = {"error": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status


def _to_int(v: Any) -> Optional[int]:
    try:
        if v is None:
            return None
        if isinstance(v, bool):
            return None
        return int(v)
    except Exception:
        return None


def _validate(payload: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
    """Returns (ok, errors, normalized_payload)."""
    errors: List[str] = []
    name = (payload.get("name") or "").strip()
    country = (payload.get("country") or "").strip()
    age = _to_int(payload.get("age"))
    world_rank = _to_int(payload.get("worldRank"))
    wins_pga = _to_int(payload.get("winsPga"))
    major_wins = _to_int(payload.get("majorWins"))
    fedex_rank = payload.get("fedexRank")
    fedex_rank = None if fedex_rank in ("", "null") else _to_int(fedex_rank)

    if not name:
        errors.append("Name is required.")
    if not country:
        errors.append("Country is required.")

    if age is None or age < 16 or age > 80:
        errors.append("Age must be 16–80.")
    if world_rank is None or world_rank < 1 or world_rank > 500:
        errors.append("World Rank must be 1–500.")
    if wins_pga is None or wins_pga < 0:
        errors.append("PGA Wins must be 0 or higher.")
    if major_wins is None or major_wins < 0:
        errors.append("Major Wins must be 0 or higher.")
    if fedex_rank is not None and (fedex_rank < 1 or fedex_rank > 250):
        errors.append("FedEx Rank must be 1–250 if provided.")

    normalized = {
        "name": name,
        "country": country,
        "age": age,
        "worldRank": world_rank,
        "winsPga": wins_pga,
        "majorWins": major_wins,
        "fedexRank": fedex_rank,
    }
    return (len(errors) == 0), errors, normalized


# -----------------------------
# API Routes
# -----------------------------
@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/golfers")
def list_golfers():
    page = _to_int(request.args.get("page")) or 1
    page_size = _to_int(request.args.get("pageSize")) or PAGE_SIZE
    page_size = PAGE_SIZE  # enforce (your current behavior)

    with _lock:
        records = _sorted(_read_all())

    total = len(records)
    total_pages = max(1, (total + page_size - 1) // page_size)

    page = min(max(1, page), total_pages)
    start = (page - 1) * page_size
    end = start + page_size
    items = records[start:end]

    return jsonify(
        {"items": items, "page": page, "pageSize": page_size, "total": total, "totalPages": total_pages}
    )


@app.get("/api/golfers/<string:golfer_id>")
def get_golfer(golfer_id: str):
    with _lock:
        records = _read_all()
    for r in records:
        if r.get("id") == golfer_id:
            return jsonify(r)
    return _error(404, "Golfer not found.")


@app.post("/api/golfers")
def create_golfer():
    payload = request.get_json(silent=True) or {}
    ok, errors, normalized = _validate(payload)
    if not ok:
        return _error(400, "Validation failed.", errors)

    new_record = {"id": f"g_{uuid.uuid4().hex}", "updatedAt": _now_ms(), **normalized}

    with _lock:
        records = _read_all()
        records.append(new_record)
        _write_all(records)

    return jsonify(new_record), 201


@app.put("/api/golfers/<string:golfer_id>")
def update_golfer(golfer_id: str):
    payload = request.get_json(silent=True) or {}
    ok, errors, normalized = _validate(payload)
    if not ok:
        return _error(400, "Validation failed.", errors)

    with _lock:
        records = _read_all()
        for i, r in enumerate(records):
            if r.get("id") == golfer_id:
                updated = {**r, **normalized, "updatedAt": _now_ms()}
                records[i] = updated
                _write_all(records)
                return jsonify(updated)

    return _error(404, "Golfer not found.")


@app.delete("/api/golfers/<string:golfer_id>")
def delete_golfer(golfer_id: str):
    with _lock:
        records = _read_all()
        next_records = [r for r in records if r.get("id") != golfer_id]
        if len(next_records) == len(records):
            return _error(404, "Golfer not found.")
        _write_all(next_records)

    return jsonify({"ok": True})


@app.get("/api/stats")
def stats():
    with _lock:
        records = _read_all()

    total = len(records)
    avg_world_rank = sum(int(r.get("worldRank") or 0) for r in records) / total if total else 0
    total_wins = sum(int(r.get("winsPga") or 0) for r in records)
    major_winners = sum(1 for r in records if int(r.get("majorWins") or 0) > 0)

    counts: Dict[str, int] = {}
    for r in records:
        c = (r.get("country") or "").strip()
        if not c:
            continue
        counts[c] = counts.get(c, 0) + 1

    top_country = None
    top_country_count = 0
    for c, n in counts.items():
        if n > top_country_count:
            top_country = c
            top_country_count = n

    return jsonify(
        {
            "total": total,
            "avgWorldRank": avg_world_rank,
            "totalWins": total_wins,
            "majorWinners": major_winners,
            "topCountry": top_country,
            "topCountryCount": top_country_count,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
