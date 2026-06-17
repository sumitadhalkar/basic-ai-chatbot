from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.models.employee import Employee, EmploymentType, EmployeeStatus
from app.models.user import User
from app.api.v1.deps import get_current_user, require_manager

router = APIRouter()


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employment_type: EmploymentType = EmploymentType.full_time
    join_date: date
    salary: float = 0
    pan_number: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None


class EmployeeUpdate(EmployeeCreate):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    join_date: Optional[date] = None
    status: Optional[EmployeeStatus] = None


async def _next_emp_id(db: AsyncSession) -> str:
    count = await db.scalar(select(func.count(Employee.id))) or 0
    return f"EMP-{(count + 1):04d}"


@router.get("")
async def list_employees(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    search: Optional[str] = None,
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    q = select(Employee).where(Employee.is_active == True)
    if search:
        q = q.where(
            Employee.first_name.ilike(f"%{search}%") |
            Employee.last_name.ilike(f"%{search}%") |
            Employee.email.ilike(f"%{search}%")
        )
    if department:
        q = q.where(Employee.department == department)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset(skip).limit(limit).order_by(Employee.first_name))
    return {"total": total, "items": result.scalars().all()}


@router.get("/departments")
async def list_departments(db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    result = await db.execute(
        select(Employee.department).where(Employee.department != None).distinct().order_by(Employee.department)
    )
    return [r[0] for r in result.all()]


@router.get("/{employee_id}")
async def get_employee(employee_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_manager)):
    e = await db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    return e


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_employee(
    body: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    existing = await db.scalar(select(Employee).where(Employee.email == body.email.lower()))
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    emp = Employee(
        employee_id=await _next_emp_id(db),
        **body.model_dump(),
    )
    emp.email = emp.email.lower()
    db.add(emp)
    await db.commit()
    await db.refresh(emp)
    return emp


@router.patch("/{employee_id}")
async def update_employee(
    employee_id: int,
    body: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    e = await db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(e, field, value)
    await db.commit()
    await db.refresh(e)
    return e


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_manager),
):
    e = await db.get(Employee, employee_id)
    if not e:
        raise HTTPException(status_code=404, detail="Employee not found")
    e.is_active = False
    e.status = EmployeeStatus.terminated
    await db.commit()
