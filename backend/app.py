import os
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import or_, func

from db import db
from models import Golfer

DEFAULT_PAGE_SIZE = 10
ALLOWED_PAGE_SIZES = {5, 10, 20, 50}
ALLOWED_SORT_FIELDS = {
    "name": Golfer.name,
    "country": Golfer.country,
    "age": Golfer.age,
    "worldRank": Golfer.worldRank,
    "winsPga": Golfer.winsPga,
    "majorWins": Golfer.majorWins,
    "fedexRank": Golfer.fedexRank,
    "updatedAt": Golfer.updatedAt,
}


def _to_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_dir(value: str) -> str:
    v = (value or "asc").lower()
    return "desc" if v == "desc" else "asc"


def _page_size(value) -> int:
    ps = _to_int(value, DEFAULT_PAGE_SIZE)
    if ps not in ALLOWED_PAGE_SIZES:
        return DEFAULT_PAGE_SIZE
    return ps


def _seed_db_if_needed():
    count = db.session.query(func.count(Golfer.id)).scalar() or 0
    if count >= 30:
        return

    # Seed from JSON file shipped with the app.
    seed_path = os.path.join(os.path.dirname(__file__), "data", "golfers.json")
    if not os.path.exists(seed_path):
        return

    import json

    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        golfer = Golfer(
            name=item.get("name", "").strip(),
            country=item.get("country", "").strip(),
            age=_to_int(item.get("age"), None),
            worldRank=_to_int(item.get("worldRank"), None),
            winsPga=_to_int(item.get("winsPga"), None),
            majorWins=_to_int(item.get("majorWins"), None),
            fedexRank=_to_int(item.get("fedexRank"), None),
            imageUrl=(item.get("imageUrl") or "").strip() or None,
            updatedAt=datetime.utcnow(),
        )
        db.session.add(golfer)

    db.session.commit()


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///local.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        reset = os.environ.get("RESET_DB", "").strip() == "1"
        if reset:
            db.drop_all()
        db.create_all()
        _seed_db_if_needed()

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.get("/api/golfers")
    def list_golfers():
        # Query params
        page = max(1, _to_int(request.args.get("page"), 1))
        page_size = _page_size(request.args.get("pageSize"))

        q = (request.args.get("q") or "").strip()
        country = (request.args.get("country") or "").strip()

        sort_key = (request.args.get("sort") or "name").strip()
        sort_dir = _normalize_dir(request.args.get("dir"))

        # Base query
        query = db.session.query(Golfer)

        # Search/filtering
        if q:
            like = f"%{q}%"
            query = query.filter(
                or_(
                    Golfer.name.ilike(like),
                    Golfer.country.ilike(like),
                )
            )

        if country:
            query = query.filter(Golfer.country == country)

        # Sorting
        sort_col = ALLOWED_SORT_FIELDS.get(sort_key, Golfer.name)
        if sort_dir == "desc":
            query = query.order_by(sort_col.desc())
        else:
            query = query.order_by(sort_col.asc())

        # Totals for paging
        total = query.count()

        # Page
        offset = (page - 1) * page_size
        rows = query.offset(offset).limit(page_size).all()

        return jsonify(
            {
                "items": [g.to_dict() for g in rows],
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

    @app.get("/api/golfers/<int:golfer_id>")
    def get_golfer(golfer_id: int):
        golfer = db.session.get(Golfer, golfer_id)
        if not golfer:
            return jsonify({"error": "Not found"}), 404
        return jsonify(golfer.to_dict())

    @app.post("/api/golfers")
    def create_golfer():
        data = request.get_json(force=True, silent=True) or {}

        name = (data.get("name") or "").strip()
        country = (data.get("country") or "").strip()
        image_url = (data.get("imageUrl") or "").strip() or None

        if not name:
            return jsonify({"error": "Name is required"}), 400
        if not country:
            return jsonify({"error": "Country is required"}), 400

        golfer = Golfer(
            name=name,
            country=country,
            age=_to_int(data.get("age"), None),
            worldRank=_to_int(data.get("worldRank"), None),
            winsPga=_to_int(data.get("winsPga"), None),
            majorWins=_to_int(data.get("majorWins"), None),
            fedexRank=_to_int(data.get("fedexRank"), None),
            imageUrl=image_url,
            updatedAt=datetime.utcnow(),
        )
        db.session.add(golfer)
        db.session.commit()

        return jsonify(golfer.to_dict()), 201

    @app.put("/api/golfers/<int:golfer_id>")
    def update_golfer(golfer_id: int):
        golfer = db.session.get(Golfer, golfer_id)
        if not golfer:
            return jsonify({"error": "Not found"}), 404

        data = request.get_json(force=True, silent=True) or {}

        name = (data.get("name") or "").strip()
        country = (data.get("country") or "").strip()
        image_url = (data.get("imageUrl") or "").strip() or None

        if not name:
            return jsonify({"error": "Name is required"}), 400
        if not country:
            return jsonify({"error": "Country is required"}), 400

        golfer.name = name
        golfer.country = country
        golfer.age = _to_int(data.get("age"), None)
        golfer.worldRank = _to_int(data.get("worldRank"), None)
        golfer.winsPga = _to_int(data.get("winsPga"), None)
        golfer.majorWins = _to_int(data.get("majorWins"), None)
        golfer.fedexRank = _to_int(data.get("fedexRank"), None)
        golfer.imageUrl = image_url
        golfer.updatedAt = datetime.utcnow()

        db.session.commit()
        return jsonify(golfer.to_dict())

    @app.delete("/api/golfers/<int:golfer_id>")
    def delete_golfer(golfer_id: int):
        golfer = db.session.get(Golfer, golfer_id)
        if not golfer:
            return jsonify({"error": "Not found"}), 404

        db.session.delete(golfer)
        db.session.commit()
        return jsonify({"ok": True})

    @app.get("/api/stats")
    def stats():
        total = db.session.query(func.count(Golfer.id)).scalar() or 0
        avg_world_rank = (
            db.session.query(func.avg(Golfer.worldRank)).filter(Golfer.worldRank != None).scalar()  # noqa: E711
        )

        return jsonify(
            {
                "totalRecords": total,
                "avgWorldRank": float(avg_world_rank) if avg_world_rank is not None else None,
            }
        )

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)