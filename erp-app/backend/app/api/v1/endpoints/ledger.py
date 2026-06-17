from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
import uuid

from app.db.session import get_db
from app.models.ledger import LedgerEntry, TransactionType
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()


class LedgerEntryCreate(BaseModel):
    transaction_type: TransactionType
    account_head: str
    amount: float
    description: Optional[str] = None
    transaction_date: datetime
    related_invoice_id: Optional[int] = None
    related_order_id: Optional[int] = None


@router.get("")
async def list_entries(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    account_head: Optional[str] = None,
    transaction_type: Optional[TransactionType] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(LedgerEntry)
    if account_head:
        q = q.where(LedgerEntry.account_head == account_head)
    if transaction_type:
        q = q.where(LedgerEntry.transaction_type == transaction_type)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit).order_by(LedgerEntry.transaction_date.desc()))
    return {"total": total, "items": result.scalars().all()}


@router.get("/summary")
async def ledger_summary(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total_credits = await db.scalar(
        select(func.sum(LedgerEntry.amount)).where(LedgerEntry.transaction_type == TransactionType.credit)
    ) or 0
    total_debits = await db.scalar(
        select(func.sum(LedgerEntry.amount)).where(LedgerEntry.transaction_type == TransactionType.debit)
    ) or 0
    return {
        "total_credits": float(total_credits),
        "total_debits": float(total_debits),
        "net_balance": float(total_credits) - float(total_debits),
    }


@router.post("")
async def create_entry(
    body: LedgerEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    last = await db.scalar(
        select(LedgerEntry.balance).order_by(LedgerEntry.created_at.desc()).limit(1)
    )
    prev_balance = float(last) if last else 0.0

    if body.transaction_type == TransactionType.credit:
        new_balance = prev_balance + body.amount
    else:
        new_balance = prev_balance - body.amount

    entry = LedgerEntry(
        reference_number=f"TXN-{uuid.uuid4().hex[:10].upper()}",
        transaction_type=body.transaction_type,
        account_head=body.account_head,
        amount=body.amount,
        balance=round(new_balance, 2),
        description=body.description,
        transaction_date=body.transaction_date,
        related_invoice_id=body.related_invoice_id,
        related_order_id=body.related_order_id,
        created_by=current_user.id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
