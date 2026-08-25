from datetime import date

from pydantic import BaseModel, ConfigDict, Field


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
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=1, max_length=128)


class EmployeeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=50)
    passport_id: str = Field(min_length=1, max_length=120)


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    department: str | None = None
    passport_id: str
    startup_data: dict = Field(default_factory=dict)


class EmployeeUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    department: str = Field(min_length=1, max_length=50)
    passport_id: str = Field(min_length=1, max_length=120)


class StartupChecklistRequest(BaseModel):
    checklist: dict


class UniformIssueRowRequest(BaseModel):
    description: str = ""
    size: str = ""
    quantity: str = ""
    condition: str = ""
    details: str = ""
    returns: str = ""
    cost: str = ""


class UniformIssueSaveRequest(BaseModel):
    rows: list[UniformIssueRowRequest]


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


class AnnualLeaveCreateRequest(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    reason: str = ""
    days_used: float = Field(gt=0)
    status: str = "Approved"


class AnnualLeaveUpdateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str = ""
    days_used: float = Field(gt=0)
    status: str = "Approved"


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


class SickLeaveCreateRequest(BaseModel):
    employee_id: int
    start_date: date
    end_date: date
    reason: str = ""
    days_used: float = Field(gt=0)
    status: str = "Approved"
    medical_cert: str = ""


class SickLeaveUpdateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: str = ""
    days_used: float = Field(gt=0)
    status: str = "Approved"
    medical_cert: str = ""


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
