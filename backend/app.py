import os
import json
import time
import math
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sqlalchemy import select, func, or_

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

_db_ready = False


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
        image_url = "/assets/images/placeholder.png"

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

        for item in data:
            fields = validate_and_build_golfer_fields(item)
            if not fields:
                continue

            g = Golfer(
                id=str(
                    item.get("id")
                    or item.get("ID")
                    or item.get("_id")
                    or os.urandom(8).hex()
                ),
                **fields,
            )
            session.add(g)

        session.commit()


def ensure_db_ready():
    global _db_ready
    if _db_ready:
        return

    with engine.begin() as conn:
        reset = (os.environ.get("RESET_DB") or "").strip() == "1"
        if reset:
            Base.metadata.drop_all(bind=conn)
        Base.metadata.create_all(bind=conn)

    seed_db_if_needed()
    _db_ready = True


def create_app():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    app = Flask(__name__)
    CORS(app)

    @app.before_request
    def _init_once():
        # Make sure the app can boot quickly for Render's port scan/health checks.
        # Initialize the DB on the first real request.
        ensure_db_ready()

    @app.get("/healthz")
    def healthz():
        # Fast endpoint for platform health probes
        return jsonify({"ok": True})

    @app.get("/")
    def index():
        return send_from_directory(project_root, "index.html")

    @app.get("/assets/<path:filename>")
    def assets(filename: str):
        return send_from_directory(os.path.join(project_root, "assets"), filename)

    @app.get("/favicon.ico")
    def favicon():
        fav_path = os.path.join(project_root, "favicon.ico")
        if os.path.exists(fav_path):
            return send_from_directory(project_root, "favicon.ico")
        return ("", 204)

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

        total_pages = max(1, int(math.ceil(total / page_size))) if page_size > 0 else 1

        return jsonify(
            {
                "items": [golfer_to_dict(g) for g in rows],
                "total": total,
                "totalPages": total_pages,
                "page": page,
                "pageSize": page_size,
                "meta": {
                    "page": page,
                    "pageSize": page_size,
                    "total": total,
                    "totalPages": total_pages,
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

            # Total PGA wins (already in your code)
            total_wins = session.execute(select(func.sum(Golfer.wins_pga))).scalar_one()
            total_wins_val = int(total_wins) if total_wins is not None else 0

            
            total_major_wins = session.execute(select(func.sum(Golfer.major_wins))).scalar_one()
            total_major_wins_val = int(total_major_wins) if total_major_wins is not None else 0

            major_winners = session.execute(
                select(func.count()).select_from(Golfer).where(Golfer.major_wins > 0)
            ).scalar_one()

            top_country_row = session.execute(
                select(Golfer.country, func.count().label("c"))
                .group_by(Golfer.country)
                .order_by(func.count().desc())
                .limit(1)
            ).first()

            top_country = top_country_row[0] if top_country_row else None
            top_country_count = int(top_country_row[1]) if top_country_row else 0

        return jsonify(
            {
                "total": total,
                "totalRecords": total,
                "avgWorldRank": avg_world_rank_val,
                "totalWins": total_wins_val,
                "totalMajorWins": total_major_wins_val, 
                "majorWinners": major_winners,
                "topCountry": top_country,
                "topCountryCount": top_country_count,
            }
        )

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)