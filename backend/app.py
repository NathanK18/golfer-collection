import os
import json
import time
from datetime import datetime
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from db import engine, SessionLocal
from models import Base, Golfer


DEFAULT_PAGE_SIZE = 10
ALLOWED_PAGE_SIZES = {5, 10, 20, 50}
ALLOWED_SORT_FIELDS = {
    "name": "name",
    "country": "country",
    "age": "age",
    "worldRank": "world_rank",
    "winsPga": "wins_pga",
    "majorWins": "major_wins",
    "fedexRank": "fedex_rank",
    "updatedAt": "updated_at",
}


def now_epoch_ms() -> int:
    return int(time.time() * 1000)


def to_int(value, default=None):
    try:
        if value is None:
            return default
        if isinstance(value, bool):
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def normalize_sort_dir(v: str) -> str:
    v = (v or "asc").lower()
    return "desc" if v == "desc" else "asc"


def normalize_page_size(v) -> int:
    ps = to_int(v, DEFAULT_PAGE_SIZE)
    if ps not in ALLOWED_PAGE_SIZES:
        return DEFAULT_PAGE_SIZE
    return ps


def golfer_to_dict(g: Golfer) -> Dict[str, Any]:
    # Output camelCase to match the frontend
    return {
        "id": g.id,
        "name": g.name,
        "country": g.country,
        "age": g.age,
        "worldRank": g.world_rank,
        "winsPga": g.wins_pga,
        "majorWins": g.major_wins,
        "fedexRank": g.fedex_rank,
        "imageUrl": g.image_url,
        "updatedAt": g.updated_at,
    }


def get_payload_field(data: Dict[str, Any], camel: str, snake: str):
    if camel in data:
        return data.get(camel)
    return data.get(snake)


def validate_and_build_golfer_fields(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    name = (get_payload_field(data, "name", "name") or "").strip()
    country = (get_payload_field(data, "country", "country") or "").strip()
    image_url = (get_payload_field(data, "imageUrl", "image_url") or "").strip()

    age = to_int(get_payload_field(data, "age", "age"), None)
    world_rank = to_int(get_payload_field(data, "worldRank", "world_rank"), None)
    wins_pga = to_int(get_payload_field(data, "winsPga", "wins_pga"), None)
    major_wins = to_int(get_payload_field(data, "majorWins", "major_wins"), None)
    fedex_rank = to_int(get_payload_field(data, "fedexRank", "fedex_rank"), None)

    if not name:
        return None
    if not country:
        return None
    if not image_url:
        return None

    # Your models.py marks these as nullable=False, so enforce them.
    if age is None or world_rank is None or wins_pga is None or major_wins is None:
        return None

    return {
        "name": name,
        "country": country,
        "age": age,
        "world_rank": world_rank,
        "wins_pga": wins_pga,
        "major_wins": major_wins,
        "fedex_rank": fedex_rank,
        "image_url": image_url,
        "updated_at": now_epoch_ms(),
    }


def seed_db_if_needed():
    with SessionLocal() as session:
        total = session.execute(select(func.count()).select_from(Golfer)).scalar_one()
        if total >= 30:
            return

        seed_path = os.path.join(os.path.dirname(__file__), "data", "golfers.json")
        if not os.path.exists(seed_path):
            return

        with open(seed_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Accept either camelCase or snake_case keys in the seed file
        for item in data:
            fields = validate_and_build_golfer_fields(item)
            if not fields:
                # Skip invalid seed rows rather than crashing production startup
                continue

            g = Golfer(
                id=str(item.get("id") or item.get("ID") or item.get("_id") or os.urandom(8).hex()),
                **fields,
            )
            session.add(g)

        session.commit()


def create_app():
    app = Flask(__name__)
    CORS(app)

    with engine.begin() as conn:
        reset = (os.environ.get("RESET_DB") or "").strip() == "1"
        if reset:
            Base.metadata.drop_all(bind=conn)
        Base.metadata.create_all(bind=conn)

    seed_db_if_needed()

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.get("/api/golfers")
    def list_golfers():
        page = max(1, to_int(request.args.get("page"), 1))
        page_size = normalize_page_size(request.args.get("pageSize"))

        q = (request.args.get("q") or "").strip()
        country = (request.args.get("country") or "").strip()

        sort_key = (request.args.get("sort") or "name").strip()
        sort_dir = normalize_sort_dir(request.args.get("dir"))

        sort_attr = ALLOWED_SORT_FIELDS.get(sort_key, "name")
        sort_col = getattr(Golfer, sort_attr)

        with SessionLocal() as session:
            stmt = select(Golfer)

            if q:
                like = f"%{q}%"
                stmt = stmt.where(or_(Golfer.name.ilike(like), Golfer.country.ilike(like)))

            if country:
                stmt = stmt.where(Golfer.country == country)

            count_stmt = select(func.count()).select_from(stmt.subquery())
            total = session.execute(count_stmt).scalar_one()

            if sort_dir == "desc":
                stmt = stmt.order_by(sort_col.desc())
            else:
                stmt = stmt.order_by(sort_col.asc())

            offset = (page - 1) * page_size
            stmt = stmt.offset(offset).limit(page_size)

            rows = session.execute(stmt).scalars().all()

        return jsonify(
            {
                "items": [golfer_to_dict(g) for g in rows],
                "meta": {
                    "page": page,
                    "pageSize": page_size,
                    "total": total,
                    "q": q,
                    "country": country,
                    "sort": sort_key,
                    "dir": sort_dir,
                    "allowedPageSizes": sorted(list(ALLOWED_PAGE_SIZES)),
                },
            }
        )

    @app.get("/api/golfers/<string:golfer_id>")
    def get_golfer(golfer_id: str):
        with SessionLocal() as session:
            g = session.get(Golfer, golfer_id)
            if not g:
                return jsonify({"error": "Not found"}), 404
            return jsonify(golfer_to_dict(g))

    @app.post("/api/golfers")
    def create_golfer():
        data = request.get_json(force=True, silent=True) or {}
        fields = validate_and_build_golfer_fields(data)
        if not fields:
            return (
                jsonify(
                    {
                        "error": "Validation failed. Required: name, country, imageUrl, age, worldRank, winsPga, majorWins."
                    }
                ),
                400,
            )

        new_id = str(get_payload_field(data, "id", "id") or os.urandom(8).hex())

        with SessionLocal() as session:
            existing = session.get(Golfer, new_id)
            if existing:
                return jsonify({"error": "ID already exists"}), 400

            g = Golfer(id=new_id, **fields)
            session.add(g)
            session.commit()
            session.refresh(g)

            return jsonify(golfer_to_dict(g)), 201

    @app.put("/api/golfers/<string:golfer_id>")
    def update_golfer(golfer_id: str):
        data = request.get_json(force=True, silent=True) or {}
        fields = validate_and_build_golfer_fields(data)
        if not fields:
            return (
                jsonify(
                    {
                        "error": "Validation failed. Required: name, country, imageUrl, age, worldRank, winsPga, majorWins."
                    }
                ),
                400,
            )

        with SessionLocal() as session:
            g = session.get(Golfer, golfer_id)
            if not g:
                return jsonify({"error": "Not found"}), 404

            for k, v in fields.items():
                setattr(g, k, v)

            session.commit()
            session.refresh(g)
            return jsonify(golfer_to_dict(g))

    @app.delete("/api/golfers/<string:golfer_id>")
    def delete_golfer(golfer_id: str):
        with SessionLocal() as session:
            g = session.get(Golfer, golfer_id)
            if not g:
                return jsonify({"error": "Not found"}), 404

            session.delete(g)
            session.commit()
            return jsonify({"ok": True})

    @app.get("/api/stats")
    def stats():
        with SessionLocal() as session:
            total = session.execute(select(func.count()).select_from(Golfer)).scalar_one()

            avg_world_rank = session.execute(select(func.avg(Golfer.world_rank))).scalar_one()
            avg_world_rank_val = float(avg_world_rank) if avg_world_rank is not None else None

        return jsonify(
            {
                "totalRecords": total,
                "avgWorldRank": avg_world_rank_val,
            }
        )

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)