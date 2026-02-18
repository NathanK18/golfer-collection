from __future__ import annotations

import os
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError

from db import SessionLocal, engine
from models import Base, Golfer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PAGE_SIZE = 10  

app = Flask(__name__)
CORS(app)

# -----------------------------
# Frontend serving
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


def _to_int(v: Any) -> Optional[int]:
    try:
        if v is None:
            return None
        if isinstance(v, bool):
            return None
        return int(v)
    except Exception:
        return None


def _error(status: int, message: str, details: Optional[List[str]] = None):
    payload: Dict[str, Any] = {"error": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status


def _validate(payload: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
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


def _seed_records() -> List[Dict[str, Any]]:
    now = _now_ms()

    def mk(name: str, country: str, age: int, world_rank: int, wins_pga: int, major_wins: int, fedex_rank: Optional[int]):
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


def init_db_and_seed() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        count = db.scalar(select(func.count()).select_from(Golfer)) or 0
        if count >= 30:
            return

        seed = _seed_records()
        golfers: List[Golfer] = []
        for r in seed:
            golfers.append(
                Golfer(
                    id=r["id"],
                    name=r["name"],
                    country=r["country"],
                    age=r["age"],
                    world_rank=r["worldRank"],
                    wins_pga=r["winsPga"],
                    major_wins=r["majorWins"],
                    fedex_rank=r["fedexRank"],
                    updated_at=r["updatedAt"],
                )
            )
        db.add_all(golfers)
        db.commit()


# Run initialization on startup
try:
    init_db_and_seed()
except Exception as e:
    print("DB init/seed failed:", repr(e))


def golfer_to_dict(g: Golfer) -> Dict[str, Any]:
    return {
        "id": g.id,
        "name": g.name,
        "country": g.country,
        "age": g.age,
        "worldRank": g.world_rank,
        "winsPga": g.wins_pga,
        "majorWins": g.major_wins,
        "fedexRank": g.fedex_rank,
        "updatedAt": g.updated_at,
    }


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
    page_size = PAGE_SIZE 

    try:
        with SessionLocal() as db:
            total = db.scalar(select(func.count()).select_from(Golfer)) or 0
            total_pages = max(1, (total + page_size - 1) // page_size)
            page = min(max(1, page), total_pages)

            offset = (page - 1) * page_size

            stmt = (
                select(Golfer)
                .order_by(Golfer.world_rank.asc())
                .offset(offset)
                .limit(page_size)
            )
            items = [golfer_to_dict(g) for g in db.scalars(stmt).all()]

        return jsonify(
            {
                "items": items,
                "page": page,
                "pageSize": page_size,
                "total": total,
                "totalPages": total_pages,
            }
        )
    except SQLAlchemyError as e:
        return _error(500, "Database error.", [str(e)])


@app.get("/api/golfers/<string:golfer_id>")
def get_golfer(golfer_id: str):
    try:
        with SessionLocal() as db:
            g = db.get(Golfer, golfer_id)
            if not g:
                return _error(404, "Golfer not found.")
            return jsonify(golfer_to_dict(g))
    except SQLAlchemyError as e:
        return _error(500, "Database error.", [str(e)])


@app.post("/api/golfers")
def create_golfer():
    payload = request.get_json(silent=True) or {}
    ok, errors, normalized = _validate(payload)
    if not ok:
        return _error(400, "Validation failed.", errors)

    new_id = f"g_{uuid.uuid4().hex}"
    now = _now_ms()

    try:
        with SessionLocal() as db:
            g = Golfer(
                id=new_id,
                name=normalized["name"],
                country=normalized["country"],
                age=normalized["age"],
                world_rank=normalized["worldRank"],
                wins_pga=normalized["winsPga"],
                major_wins=normalized["majorWins"],
                fedex_rank=normalized["fedexRank"],
                updated_at=now,
            )
            db.add(g)
            db.commit()
            db.refresh(g)
            return jsonify(golfer_to_dict(g)), 201
    except SQLAlchemyError as e:
        return _error(500, "Database error.", [str(e)])


@app.put("/api/golfers/<string:golfer_id>")
def update_golfer(golfer_id: str):
    payload = request.get_json(silent=True) or {}
    ok, errors, normalized = _validate(payload)
    if not ok:
        return _error(400, "Validation failed.", errors)

    try:
        with SessionLocal() as db:
            g = db.get(Golfer, golfer_id)
            if not g:
                return _error(404, "Golfer not found.")

            g.name = normalized["name"]
            g.country = normalized["country"]
            g.age = normalized["age"]
            g.world_rank = normalized["worldRank"]
            g.wins_pga = normalized["winsPga"]
            g.major_wins = normalized["majorWins"]
            g.fedex_rank = normalized["fedexRank"]
            g.updated_at = _now_ms()

            db.commit()
            db.refresh(g)
            return jsonify(golfer_to_dict(g))
    except SQLAlchemyError as e:
        return _error(500, "Database error.", [str(e)])


@app.delete("/api/golfers/<string:golfer_id>")
def delete_golfer(golfer_id: str):
    try:
        with SessionLocal() as db:
            g = db.get(Golfer, golfer_id)
            if not g:
                return _error(404, "Golfer not found.")
            db.delete(g)
            db.commit()
            return jsonify({"ok": True})
    except SQLAlchemyError as e:
        return _error(500, "Database error.", [str(e)])


@app.get("/api/stats")
def stats():
    try:
        with SessionLocal() as db:
            total = db.scalar(select(func.count()).select_from(Golfer)) or 0
            if total == 0:
                return jsonify(
                    {
                        "total": 0,
                        "avgWorldRank": 0,
                        "totalWins": 0,
                        "majorWinners": 0,
                        "topCountry": None,
                        "topCountryCount": 0,
                    }
                )

            avg_world_rank = db.scalar(select(func.avg(Golfer.world_rank))) or 0
            total_wins = db.scalar(select(func.sum(Golfer.wins_pga))) or 0
            major_winners = db.scalar(select(func.count()).where(Golfer.major_wins > 0)) or 0

            top_row = db.execute(
                select(Golfer.country, func.count().label("n"))
                .group_by(Golfer.country)
                .order_by(func.count().desc())
                .limit(1)
            ).first()

            top_country = top_row[0] if top_row else None
            top_country_count = int(top_row[1]) if top_row else 0

            return jsonify(
                {
                    "total": total,
                    "avgWorldRank": float(avg_world_rank),
                    "totalWins": int(total_wins),
                    "majorWinners": int(major_winners),
                    "topCountry": top_country,
                    "topCountryCount": top_country_count,
                }
            )
    except SQLAlchemyError as e:
        return _error(500, "Database error.", [str(e)])


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5050"))
    app.run(host="0.0.0.0", port=port, debug=True)
