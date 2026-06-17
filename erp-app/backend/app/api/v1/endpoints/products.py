from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.db.session import get_db
from app.models.product import Product, ProductType
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()


class ProductCreate(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    product_type: ProductType = ProductType.goods
    category: Optional[str] = None
    unit: str = "pcs"
    purchase_price: float = 0
    selling_price: float = 0
    tax_rate: float = 18.0
    hsn_code: Optional[str] = None
    stock_quantity: int = 0
    reorder_level: int = 10


class ProductUpdate(ProductCreate):
    sku: Optional[str] = None
    name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_products(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Product).where(Product.is_active == True)
    if search:
        q = q.where(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))
    if category:
        q = q.where(Product.category == category)
    if low_stock:
        q = q.where(Product.stock_quantity <= Product.reorder_level)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit).order_by(Product.name))
    return {"total": total, "items": result.scalars().all()}


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(
        select(Product.category).where(Product.category != None).distinct().order_by(Product.category)
    )
    return [r[0] for r in result.all()]


@router.get("/{product_id}")
async def get_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = await db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    existing = await db.scalar(select(Product).where(Product.sku == body.sku))
    if existing:
        raise HTTPException(status_code=400, detail="SKU already exists")

    product = Product(**body.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/{product_id}")
async def update_product(
    product_id: int,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    p = await db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    p = await db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p.is_active = False
    await db.commit()
