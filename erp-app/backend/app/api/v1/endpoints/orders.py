from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.db.session import get_db
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int
    unit_price: Optional[float] = None
    discount: float = 0


class OrderCreate(BaseModel):
    customer_id: int
    order_date: datetime
    delivery_date: Optional[datetime] = None
    items: List[OrderItemIn]
    shipping_address: Optional[str] = None
    notes: Optional[str] = None


async def _next_order_number(db: AsyncSession) -> str:
    count = await db.scalar(select(func.count(Order.id))) or 0
    return f"ORD-{(count + 1):06d}"


@router.get("")
async def list_orders(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    status: Optional[OrderStatus] = None,
    customer_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Order)
    if status:
        q = q.where(Order.status == status)
    if customer_id:
        q = q.where(Order.customer_id == customer_id)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit).order_by(Order.created_at.desc()))
    return {"total": total, "items": result.scalars().all()}


@router.get("/{order_id}")
async def get_order(order_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    o = await db.get(Order, order_id)
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(
    body: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = Order(
        order_number=await _next_order_number(db),
        customer_id=body.customer_id,
        order_date=body.order_date,
        delivery_date=body.delivery_date,
        shipping_address=body.shipping_address,
        notes=body.notes,
        created_by=current_user.id,
        status=OrderStatus.draft,
    )

    subtotal = 0.0
    tax_total = 0.0

    for item_in in body.items:
        product = await db.get(Product, item_in.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item_in.product_id} not found")

        unit_price = item_in.unit_price if item_in.unit_price is not None else float(product.selling_price)
        tax_amount = round(unit_price * item_in.quantity * float(product.tax_rate) / 100, 2)
        line_total = round(unit_price * item_in.quantity - item_in.discount + tax_amount, 2)

        order_item = OrderItem(
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            quantity=item_in.quantity,
            unit_price=unit_price,
            tax_rate=float(product.tax_rate),
            tax_amount=tax_amount,
            discount=item_in.discount,
            line_total=line_total,
        )
        order.items.append(order_item)
        subtotal += unit_price * item_in.quantity - item_in.discount
        tax_total += tax_amount

    order.subtotal = round(subtotal, 2)
    order.tax_amount = round(tax_total, 2)
    order.total_amount = round(subtotal + tax_total, 2)

    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: int,
    new_status: OrderStatus,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    o = await db.get(Order, order_id)
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    o.status = new_status
    await db.commit()
    return {"id": o.id, "status": o.status}


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    o = await db.get(Order, order_id)
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    if o.status not in (OrderStatus.draft, OrderStatus.cancelled):
        raise HTTPException(status_code=400, detail="Only draft or cancelled orders can be deleted")
    await db.delete(o)
    await db.commit()
