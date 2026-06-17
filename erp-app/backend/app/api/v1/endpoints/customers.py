from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.models.customer import Customer
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()


class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    gst_number: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: str = "India"
    pincode: Optional[str] = None
    credit_limit: float = 0
    notes: Optional[str] = None


class CustomerUpdate(CustomerCreate):
    name: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("")
async def list_customers(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Customer)
    if search:
        q = q.where(
            Customer.name.ilike(f"%{search}%") |
            Customer.email.ilike(f"%{search}%") |
            Customer.company.ilike(f"%{search}%")
        )
    if is_active is not None:
        q = q.where(Customer.is_active == is_active)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit).order_by(Customer.name))
    return {"total": total, "items": result.scalars().all()}


@router.get("/{customer_id}")
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    c = await db.get(Customer, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer(
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if body.email:
        existing = await db.scalar(select(Customer).where(Customer.email == body.email.lower()))
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

    customer = Customer(**body.model_dump())
    if customer.email:
        customer.email = customer.email.lower()
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.patch("/{customer_id}")
async def update_customer(
    customer_id: int,
    body: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    c = await db.get(Customer, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    await db.commit()
    await db.refresh(c)
    return c


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    c = await db.get(Customer, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    await db.delete(c)
    await db.commit()
