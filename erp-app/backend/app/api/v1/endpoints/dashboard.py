from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.order import Order, OrderStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.customer import Customer
from app.models.product import Product
from app.models.employee import Employee
from app.models.ledger import LedgerEntry, TransactionType
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter()


@router.get("")
async def get_dashboard(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Counts
    total_customers = await db.scalar(select(func.count(Customer.id)).where(Customer.is_active == True)) or 0
    total_products = await db.scalar(select(func.count(Product.id)).where(Product.is_active == True)) or 0
    total_employees = await db.scalar(select(func.count(Employee.id)).where(Employee.is_active == True)) or 0

    # Orders
    total_orders = await db.scalar(select(func.count(Order.id))) or 0
    orders_this_month = await db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= month_start)
    ) or 0
    pending_orders = await db.scalar(
        select(func.count(Order.id)).where(Order.status.in_([OrderStatus.draft, OrderStatus.confirmed, OrderStatus.processing]))
    ) or 0

    # Revenue
    revenue_this_month = await db.scalar(
        select(func.sum(Invoice.total_amount)).where(
            Invoice.status == InvoiceStatus.paid,
            Invoice.created_at >= month_start,
        )
    ) or 0
    total_revenue = await db.scalar(
        select(func.sum(Invoice.total_amount)).where(Invoice.status == InvoiceStatus.paid)
    ) or 0
    outstanding = await db.scalar(
        select(func.sum(Invoice.balance_due)).where(Invoice.status.in_([InvoiceStatus.sent, InvoiceStatus.partially_paid, InvoiceStatus.overdue]))
    ) or 0

    # Low stock
    low_stock_count = await db.scalar(
        select(func.count(Product.id)).where(
            Product.is_active == True,
            Product.stock_quantity <= Product.reorder_level,
        )
    ) or 0

    # Recent orders
    result = await db.execute(
        select(Order).order_by(Order.created_at.desc()).limit(5)
    )
    recent_orders = result.scalars().all()

    # Overdue invoices
    overdue = await db.scalar(
        select(func.count(Invoice.id)).where(
            Invoice.status.in_([InvoiceStatus.sent, InvoiceStatus.partially_paid]),
            Invoice.due_date < now,
        )
    ) or 0

    return {
        "customers": total_customers,
        "products": total_products,
        "employees": total_employees,
        "total_orders": total_orders,
        "orders_this_month": orders_this_month,
        "pending_orders": pending_orders,
        "revenue_this_month": float(revenue_this_month),
        "total_revenue": float(total_revenue),
        "outstanding_receivables": float(outstanding),
        "low_stock_products": low_stock_count,
        "overdue_invoices": overdue,
        "recent_orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "customer_id": o.customer_id,
                "status": o.status,
                "total_amount": float(o.total_amount),
                "created_at": o.created_at,
            }
            for o in recent_orders
        ],
    }
