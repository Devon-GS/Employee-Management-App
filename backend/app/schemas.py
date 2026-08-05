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
    passport_id: str = Field(min_length=1, max_length=120)


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    passport_id: str
    startup_data: dict = Field(default_factory=dict)


class EmployeeUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    passport_id: str = Field(min_length=1, max_length=120)


class StartupChecklistRequest(BaseModel):
    checklist: dict


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
