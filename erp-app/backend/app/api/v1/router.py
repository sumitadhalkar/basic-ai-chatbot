from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, customers, products, orders, invoices, employees, ledger, dashboard, health

api_router = APIRouter()

api_router.include_router(health.router,     prefix="/health",     tags=["health"])
api_router.include_router(auth.router,       prefix="/auth",       tags=["auth"])
api_router.include_router(users.router,      prefix="/users",      tags=["users"])
api_router.include_router(customers.router,  prefix="/customers",  tags=["customers"])
api_router.include_router(products.router,   prefix="/products",   tags=["products"])
api_router.include_router(orders.router,     prefix="/orders",     tags=["orders"])
api_router.include_router(invoices.router,   prefix="/invoices",   tags=["invoices"])
api_router.include_router(employees.router,  prefix="/employees",  tags=["employees"])
api_router.include_router(ledger.router,     prefix="/ledger",     tags=["ledger"])
api_router.include_router(dashboard.router,  prefix="/dashboard",  tags=["dashboard"])
