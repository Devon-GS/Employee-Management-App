import copy
import os
from pathlib import Path
from uuid import uuid4

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import Base, SessionLocal, engine, get_db
from .models import ContractFile, Employee, EmployeeDocument, User
from .schemas import (
    ChangePasswordRequest,
    ContractFileResponse,
    EmployeeCreateRequest,
    EmployeeDocumentResponse,
    EmployeeResponse,
    LoginRequest,
    TokenResponse,
    UserResponse,
    StartupChecklistRequest,
    EmployeeUpdateRequest,
)


app = FastAPI(title="Employee Management App")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".jpg", ".jpeg"}
DOCUMENT_TYPE_LABELS = {
    "contract": "Contract",
    "passport_id_copy": "Passport / ID Copy",
    "permit_copy": "Permit Copy",
}

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


DEFAULT_STARTUP_CHECKLIST = {
    "Contract": {"done": False, "na": False, "date": None},
    "Contract Status": {"done": False, "na": False, "date": None, "status": "", "info": "", "on_system": False},
    "Permit Status": {"done": False, "na": False, "date": None},
    "Passport / ID Copy": {"done": False, "na": False, "date": None},
    "Permit Copy": {"done": False, "na": False, "date": None},
    "Name for file & Name Badge": {"done": False, "na": False, "date": None},
    "Uniform & Uniform Letter & Uniform Sizes Onto Chart & Employ No. & Badge No.": {"done": False, "na": False, "date": None},
    "Start": {"done": False, "na": False, "date": None},
    "UIF": {"done": False, "na": False, "date": None},
    "MIBCO reg": {"done": False, "na": False, "date": None},
    "Open Weekly Deduction Sheet": {"done": False, "na": False, "date": None},
    "Disciplinary Spreadsheet & Permit Spreadsheet": {"done": False, "na": False, "date": None},
    "Phone No. onto Contacts List": {"done": False, "na": False, "date": None},
    "Staff Instructions / Training Pack / Job Description": {"done": False, "na": False, "date": None},
}


def build_startup_defaults() -> dict:
    return copy.deepcopy(DEFAULT_STARTUP_CHECKLIST)


def normalize_startup_data(data: dict | None) -> dict:
    normalized = build_startup_defaults()
    if not data:
        return normalized

    legacy_job_description = data.get("Job Description") if isinstance(data, dict) else None
    if (
        isinstance(legacy_job_description, dict)
        and "Staff Instructions / Training Pack / Job Description" not in data
    ):
        data = dict(data)
        data["Staff Instructions / Training Pack / Job Description"] = legacy_job_description

    for key, value in data.items():
        if key in normalized and isinstance(value, dict):
            normalized[key] = {**normalized[key], **value}
        else:
            normalized[key] = value
    return normalized


@app.on_event("startup")
def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "uq_employees_passport_id ON employees (passport_id)"
            )
        )
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
    passport_id = payload.passport_id.strip()
    existing = db.scalar(select(Employee).where(Employee.passport_id == passport_id))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Passport/ID must be unique")

    employee = Employee(
        name=payload.name.strip(),
        passport_id=passport_id,
        startup_data=build_startup_defaults(),
    )
    db.add(employee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Passport/ID must be unique") from None
    db.refresh(employee)
    return employee


@app.get("/api/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EmployeeResponse:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


@app.put("/api/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EmployeeResponse:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    passport_id = payload.passport_id.strip()
    existing = db.scalar(
        select(Employee).where(Employee.passport_id == passport_id, Employee.id != employee_id)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Passport/ID must be unique")

    employee.name = payload.name.strip()
    employee.passport_id = passport_id
    db.add(employee)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Passport/ID must be unique") from None
    db.refresh(employee)
    return employee


@app.get("/api/employees/{employee_id}/startup")
def get_employee_startup(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return {
        "employee_id": employee.id,
        "employee_name": employee.name,
        "startup_data": normalize_startup_data(employee.startup_data),
    }


@app.put("/api/employees/{employee_id}/startup")
def update_employee_startup(
    employee_id: int,
    payload: StartupChecklistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    employee.startup_data = normalize_startup_data(payload.checklist)
    db.add(employee)
    db.commit()
    return {"message": "Startup checklist updated successfully"}


def _get_employee_or_404(db: Session, employee_id: int) -> Employee:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


def _contract_file_path(stored_filename: str) -> Path:
    return UPLOAD_DIR / stored_filename


def _document_path(stored_filename: str) -> Path:
    return UPLOAD_DIR / stored_filename


def _normalize_document_type(document_type: str) -> str:
    if document_type not in DOCUMENT_TYPE_LABELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document type")
    return document_type


@app.get("/api/employees/{employee_id}/contract-files", response_model=list[ContractFileResponse])
def list_contract_files(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContractFileResponse]:
    _get_employee_or_404(db, employee_id)
    files = db.scalars(
        select(ContractFile).where(ContractFile.employee_id == employee_id).order_by(ContractFile.id.asc())
    ).all()
    return files


@app.post(
    "/api/employees/{employee_id}/contract-files",
    response_model=list[ContractFileResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_contract_file(
    employee_id: int,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ContractFileResponse]:
    _get_employee_or_404(db, employee_id)

    for file in files:
        original_name = file.filename or ""
        suffix = Path(original_name).suffix.lower()
        if suffix not in ALLOWED_CONTRACT_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a .pdf, .doc, .docx, .jpg, or .jpeg",
            )

    created_files: list[ContractFile] = []

    for file in files:
        original_name = file.filename or ""
        suffix = Path(original_name).suffix.lower()

        stored_filename = f"{uuid4().hex}{suffix}"
        destination = _contract_file_path(stored_filename)

        size_bytes = 0
        with destination.open("wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size_bytes += len(chunk)
                buffer.write(chunk)

        created_files.append(
            ContractFile(
                employee_id=employee_id,
                original_filename=original_name,
                stored_filename=stored_filename,
                content_type=file.content_type or "application/octet-stream",
                size_bytes=size_bytes,
            )
        )

    db.add_all(created_files)
    db.commit()
    for contract_file in created_files:
        db.refresh(contract_file)
    return created_files


@app.get("/api/contract-files/{file_id}/download")
def download_contract_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    contract_file = db.get(ContractFile, file_id)
    if contract_file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = _contract_file_path(contract_file.stored_filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing from storage")

    return FileResponse(
        path,
        media_type=contract_file.content_type,
        filename=contract_file.original_filename,
    )


@app.get("/api/contract-files/{file_id}/view")
def view_contract_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    contract_file = db.get(ContractFile, file_id)
    if contract_file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = _contract_file_path(contract_file.stored_filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing from storage")

    response = FileResponse(path, media_type=contract_file.content_type, filename=contract_file.original_filename)
    response.headers["Content-Disposition"] = f'inline; filename="{contract_file.original_filename}"'
    return response


@app.delete("/api/contract-files/{file_id}")
def delete_contract_file(
    file_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    contract_file = db.get(ContractFile, file_id)
    if contract_file is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_path = _contract_file_path(contract_file.stored_filename)
    db.delete(contract_file)
    db.commit()

    def remove_file(path: Path) -> None:
        if path.exists():
            path.unlink()

    background_tasks.add_task(remove_file, file_path)
    return {"message": "File deleted successfully"}


@app.get("/api/employees/{employee_id}/documents/{document_type}", response_model=list[EmployeeDocumentResponse])
def list_employee_documents(
    employee_id: int,
    document_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EmployeeDocumentResponse]:
    _get_employee_or_404(db, employee_id)
    document_type = _normalize_document_type(document_type)
    documents = db.scalars(
        select(EmployeeDocument)
        .where(EmployeeDocument.employee_id == employee_id, EmployeeDocument.document_type == document_type)
        .order_by(EmployeeDocument.id.asc())
    ).all()
    return documents


@app.post(
    "/api/employees/{employee_id}/documents/{document_type}",
    response_model=list[EmployeeDocumentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_employee_documents(
    employee_id: int,
    document_type: str,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[EmployeeDocumentResponse]:
    _get_employee_or_404(db, employee_id)
    document_type = _normalize_document_type(document_type)

    for file in files:
        original_name = file.filename or ""
        suffix = Path(original_name).suffix.lower()
        if suffix not in ALLOWED_DOCUMENT_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be a .pdf, .doc, .docx, .jpg, or .jpeg",
            )

    created_documents: list[EmployeeDocument] = []

    for file in files:
        original_name = file.filename or ""
        suffix = Path(original_name).suffix.lower()

        stored_filename = f"{uuid4().hex}{suffix}"
        destination = _document_path(stored_filename)

        size_bytes = 0
        with destination.open("wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size_bytes += len(chunk)
                buffer.write(chunk)

        created_documents.append(
            EmployeeDocument(
                employee_id=employee_id,
                document_type=document_type,
                original_filename=original_name,
                stored_filename=stored_filename,
                content_type=file.content_type or "application/octet-stream",
                size_bytes=size_bytes,
            )
        )

    db.add_all(created_documents)
    db.commit()
    for document in created_documents:
        db.refresh(document)
    return created_documents


@app.get("/api/documents/{document_id}/download")
def download_employee_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    document = db.get(EmployeeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = _document_path(document.stored_filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing from storage")

    return FileResponse(path, media_type=document.content_type, filename=document.original_filename)


@app.get("/api/documents/{document_id}/view")
def view_employee_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    document = db.get(EmployeeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = _document_path(document.stored_filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing from storage")

    response = FileResponse(path, media_type=document.content_type, filename=document.original_filename)
    response.headers["Content-Disposition"] = f'inline; filename="{document.original_filename}"'
    return response


@app.delete("/api/documents/{document_id}")
def delete_employee_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    document = db.get(EmployeeDocument, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_path = _document_path(document.stored_filename)
    db.delete(document)
    db.commit()

    def remove_file(path: Path) -> None:
        if path.exists():
            path.unlink()

    background_tasks.add_task(remove_file, file_path)
    return {"message": "File deleted successfully"}
