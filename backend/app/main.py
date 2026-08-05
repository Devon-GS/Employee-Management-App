from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import Base, SessionLocal, engine, get_db
from .models import Employee, User
from .schemas import (
    ChangePasswordRequest,
    EmployeeCreateRequest,
    EmployeeResponse,
    LoginRequest,
    TokenResponse,
    UserResponse,
)


app = FastAPI(title="Employee Management App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_admin_user(db: Session) -> None:
    existing_user = db.scalar(select(User).where(User.username == "admin"))
    if existing_user is None:
        db.add(User(username="admin", password_hash=hash_password("admin")))
        db.commit()


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_admin_user(db)
    finally:
        db.close()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return TokenResponse(access_token=create_access_token(user))


@app.get("/api/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)) -> UserResponse:
    return current_user


@app.post("/api/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if current_user.username != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can change password")

    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()

    return {"message": "Password updated successfully"}


@app.get("/api/employees", response_model=list[EmployeeResponse])
def list_employees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EmployeeResponse]:
    employees = db.scalars(select(Employee).order_by(Employee.name.asc())).all()
    return employees


@app.post("/api/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EmployeeResponse:
    employee = Employee(name=payload.name.strip(), passport_id=payload.passport_id.strip())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee
