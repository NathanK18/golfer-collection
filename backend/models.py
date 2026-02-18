from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, BigInteger

class Base(DeclarativeBase):
    pass

class Golfer(Base):
    __tablename__ = "golfers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str] = mapped_column(String(10), nullable=False)

    age: Mapped[int] = mapped_column(Integer, nullable=False)
    world_rank: Mapped[int] = mapped_column(Integer, nullable=False)
    wins_pga: Mapped[int] = mapped_column(Integer, nullable=False)
    major_wins: Mapped[int] = mapped_column(Integer, nullable=False)
    fedex_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
