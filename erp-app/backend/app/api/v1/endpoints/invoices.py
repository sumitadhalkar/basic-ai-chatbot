from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()


class InvoiceCreate(BaseModel):
    customer_id: int
    order_id: Optional[int] = None
    invoice_date: datetime
    due_date: datetime
    subtotal: float
    tax_amount: float = 0
    discount_amount: float = 0
    notes: Optional[str] = None
    terms: Optional[str] = None


class PaymentRecord(BaseModel):
    amount: float


async def _next_invoice_number(db: AsyncSession) -> str:
    count = await db.scalar(select(func.count(Invoice.id))) or 0
    return f"INV-{(count + 1):06d}"


@router.get("")
async def list_invoices(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    status: Optional[InvoiceStatus] = None,
    customer_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Invoice)
    if status:
        q = q.where(Invoice.status == status)
    if customer_id:
        q = q.where(Invoice.customer_id == customer_id)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit).order_by(Invoice.created_at.desc()))
    return {"total": total, "items": result.scalars().all()}


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_invoice(
    body: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = round(body.subtotal + body.tax_amount - body.discount_amount, 2)
    inv = Invoice(
        invoice_number=await _next_invoice_number(db),
        customer_id=body.customer_id,
        order_id=body.order_id,
        invoice_date=body.invoice_date,
        due_date=body.due_date,
        subtotal=body.subtotal,
        tax_amount=body.tax_amount,
        discount_amount=body.discount_amount,
        total_amount=total,
        balance_due=total,
        notes=body.notes,
        terms=body.terms,
        created_by=current_user.id,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return inv


@router.post("/{invoice_id}/payment")
async def record_payment(
    invoice_id: int,
    body: PaymentRecord,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")
    if body.amount > float(inv.balance_due):
        raise HTTPException(status_code=400, detail="Payment exceeds balance due")

    inv.paid_amount = round(float(inv.paid_amount) + body.amount, 2)
    inv.balance_due = round(float(inv.total_amount) - float(inv.paid_amount), 2)

    if inv.balance_due <= 0:
        inv.status = InvoiceStatus.paid
    elif float(inv.paid_amount) > 0:
        inv.status = InvoiceStatus.partially_paid

    await db.commit()
    await db.refresh(inv)
    return inv


@router.patch("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    new_status: InvoiceStatus,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    inv = await db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.status = new_status
    await db.commit()
    return {"id": inv.id, "status": inv.status}
