from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, Numeric, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.db.session import Base


class ProductType(str, enum.Enum):
    goods = "goods"
    service = "service"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_type: Mapped[ProductType] = mapped_column(SAEnum(ProductType), default=ProductType.goods)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    unit: Mapped[str] = mapped_column(String(50), default="pcs")
    purchase_price: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    selling_price: Mapped[float] = mapped_column(Numeric(15, 2), default=0)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=18.0)   # GST %
    hsn_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
