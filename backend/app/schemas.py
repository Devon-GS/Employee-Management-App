from datetime import date
from enum import StrEnum
import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LeaveStatus(StrEnum):
    APPROVED = "Approved"
    PENDING = "Pending"
    REJECTED = "Rejected"


STARTUP_CHECKLIST_ALLOWED_KEYS = {
    "Contract",
    "Contract Status",
    "Permit Status",
    "Passport / ID Copy",
    "Permit Copy",
    "Name for file & Name Badge",
    "Uniform & Uniform Care Letter",
    "Start",
    "UIF",
    "MIBCO reg",
    "Open Weekly Deduction Sheet",
    "Disciplinary Spreadsheet & Permit Spreadsheet",
    "Phone No. onto Contacts List",
    "Staff Instructions / Training Pack / Job Description",
    "Job Description",
    "Uniform & Uniform Letter & Uniform Sizes Onto Chart & Employ No. & Badge No.",
}


def _validate_startup_value(value: object, depth: int = 0) -> None:
    if depth > 4:
        raise ValueError("Startup checklist nesting is too deep")
    if isinstance(value, str):
        if len(value) > 2000:
            raise ValueError("Startup checklist text is too long")
    elif isinstance(value, dict):
        if len(value) > 20:
            raise ValueError("Startup checklist object contains too many keys")
        for key, item in value.items():
            if not isinstance(key, str) or len(key) > 120:
                raise ValueError("Startup checklist keys are invalid")
            _validate_startup_value(item, depth + 1)
    elif isinstance(value, list):
        if len(value) > 20:
            raise ValueError("Startup checklist list contains too many items")
        for item in value:
            _validate_startup_value(item, depth + 1)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class ChangePasswordRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str | None = Field(default=None, min_length=1, max_length=128)


class EmployeeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=50)
    passport_id: str = Field(min_length=1, max_length=120)
    annual_leave_days: int | None = Field(default=None, gt=0, le=366)


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    department: str | None = None
    passport_id: str
    annual_leave_days: int | None = None
    startup_data: dict = Field(default_factory=dict)
    archived: bool = False


class EmployeeProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    department: str | None = None
    passport_id: str
    annual_leave_days: int | None = None
    archived: bool = False
    permanent_contract_start_date: date | None = None
    permit_expire_date: date | None = None
    annual_leave_entitlement: float
    annual_leave_balance: float
    sick_leave_entitlement: float
    sick_leave_balance: float


class EmployeeUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=50)
    passport_id: str = Field(min_length=1, max_length=120)
    annual_leave_days: int | None = Field(default=None, gt=0, le=366)


class StartupChecklistRequest(BaseModel):
    checklist: dict[str, object] = Field(max_length=20)

    @model_validator(mode="after")
    def validate_checklist(self):
        unknown_keys = set(self.checklist) - STARTUP_CHECKLIST_ALLOWED_KEYS
        if unknown_keys:
            raise ValueError("Startup checklist contains unsupported keys")
        _validate_startup_value(self.checklist)
        return self


class UniformIssueRowRequest(BaseModel):
    description: str = Field(default="", max_length=200)
    size: str = Field(default="", max_length=200)
    quantity: str = Field(default="", max_length=200)
    condition: str = Field(default="", max_length=200)
    details: str = Field(default="", max_length=200)
    returns: str = Field(default="", max_length=200)
    cost: str = Field(default="", max_length=200)


class UniformIssueSaveRequest(BaseModel):
    rows: list[UniformIssueRowRequest] = Field(max_length=10)


class UniformIssueWorkbookResponse(BaseModel):
    employee_name: str
    rows: list[UniformIssueRowRequest]


class ContractFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    original_filename: str
    content_type: str
    size_bytes: int


class EmployeeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    document_type: str
    original_filename: str
    content_type: str
    size_bytes: int


class LeaveRequestBase(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    reason: str = ""
    days_used: float = Field(gt=0, allow_inf_nan=False)
    status: LeaveStatus = LeaveStatus.APPROVED

    @model_validator(mode="after")
    def validate_date_range(self):
        if not math.isfinite(self.days_used):
            raise ValueError("days_used must be finite")
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class AnnualLeaveCreateRequest(LeaveRequestBase):
    pass


class AnnualLeaveUpdateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str = ""
    days_used: float = Field(gt=0, allow_inf_nan=False)
    status: LeaveStatus = LeaveStatus.APPROVED

    @model_validator(mode="after")
    def validate_date_range(self):
        if not math.isfinite(self.days_used):
            raise ValueError("days_used must be finite")
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class AnnualLeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: str
    start_date: date
    end_date: date
    reason: str | None = None
    days_used: float
    status: str


class SickLeaveCreateRequest(LeaveRequestBase):
    medical_cert: Literal["", "__keep__"] = ""


class SickLeaveUpdateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str = ""
    days_used: float = Field(gt=0, allow_inf_nan=False)
    status: LeaveStatus = LeaveStatus.APPROVED
    medical_cert: Literal["", "__keep__"] = ""

    @model_validator(mode="after")
    def validate_date_range(self):
        if not math.isfinite(self.days_used):
            raise ValueError("days_used must be finite")
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class SickLeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: str
    start_date: date
    end_date: date
    reason: str | None = None
    days_used: float
    medical_cert: str | None = None
    status: str


class EmployeeLeaveSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    passport_id: str
    permanent_contract_start_date: date | None = None
    annual_leave_entitlement: float
    annual_leave_balance: float
    sick_leave_entitlement: float
    sick_leave_balance: float


class EmployeeLeaveReportResponse(BaseModel):
    employees: list[EmployeeLeaveSummaryResponse]
    annual: list[AnnualLeaveResponse]
    sick: list[SickLeaveResponse]
