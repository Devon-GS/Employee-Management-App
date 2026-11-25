import asyncio
import io
import os
import shutil
from datetime import date
from pathlib import Path

import pytest
import httpx
from fastapi import HTTPException
from starlette.datastructures import UploadFile

# Importing the application reads its deployment settings at module load time;
# these values keep unit tests isolated from a production environment.
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://test:test@localhost:5432/test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-at-least-32-bytes-long")
os.environ.setdefault("ADMIN_USERNAME", "test-admin")
os.environ.setdefault("ADMIN_PASSWORD", "test-password-123")

from app.main import (
    MAX_FILES_PER_REQUEST,
    _bulk_annual_leave_balances,
    _bulk_sick_leave_balances,
    _months_employed,
    _save_upload,
    _validate_file_batch,
    upload_contract_file,
)
from app import main as main_module
from app.models import Employee
from app.schemas import (
    AnnualLeaveCreateRequest,
    AnnualLeaveUpdateRequest,
    SickLeaveCreateRequest,
    StartupChecklistRequest,
    UniformIssueSaveRequest,
)
from app.auth import get_current_user
from app.database import get_db
from app.models import SickLeave


def test_leave_allows_days_independent_of_calendar_span():
    payload = AnnualLeaveCreateRequest(
        employee_id=1,
        start_date="2026-01-01",
        end_date="2026-01-10",
        days_used=0.5,
        status="Approved",
    )
    assert payload.days_used == 0.5


@pytest.mark.parametrize(
    "payload",
    [
        {"employee_id": 1, "start_date": "2026-01-10", "end_date": "2026-01-01", "days_used": 1},
        {"employee_id": 1, "start_date": "2026-01-01", "end_date": "2026-01-02", "days_used": -1},
        {"employee_id": 1, "start_date": "2026-01-01", "end_date": "2026-01-02", "days_used": float("nan")},
        {"employee_id": 1, "start_date": "2026-01-01", "end_date": "2026-01-02", "days_used": float("inf")},
        {"employee_id": 1, "start_date": "2026-01-01", "end_date": "2026-01-02", "days_used": None},
        {"employee_id": 1, "start_date": "2026-01-01", "end_date": "2026-01-02", "days_used": 1, "status": "Unknown"},
    ],
)
def test_annual_leave_rejects_invalid_values(payload):
    with pytest.raises(ValueError):
        AnnualLeaveUpdateRequest(**payload)


def test_sick_leave_rejects_malformed_types_and_invalid_status():
    with pytest.raises(ValueError):
        SickLeaveCreateRequest(
            employee_id="not-an-integer",
            start_date="2026-01-01",
            end_date="2026-01-02",
            days_used="NaN",
            status="Approved",
        )
    with pytest.raises(ValueError):
        SickLeaveCreateRequest(
            employee_id=1,
            start_date="2026-01-01",
            end_date="2026-01-02",
            days_used=1,
            status="Cancelled",
        )


def test_startup_and_uniform_payload_bounds():
    with pytest.raises(ValueError):
        StartupChecklistRequest(checklist={"unsupported": {"done": True}})
    with pytest.raises(ValueError):
        StartupChecklistRequest(checklist={"Contract": {"notes": "x" * 2001}})
    with pytest.raises(ValueError):
        UniformIssueSaveRequest(rows=[{}] * 11)


def test_upload_size_failure_removes_partial_file():
    destination = Path(".test-partial-upload.pdf")
    destination.unlink(missing_ok=True)
    upload = UploadFile(filename="partial.pdf", file=io.BytesIO(b"%PDF-" + b"x" * 20))

    try:
        with pytest.raises(HTTPException) as error:
            asyncio.run(_save_upload(upload, destination, max_size_bytes=10))

        assert error.value.status_code == 413
        assert not destination.exists()
    finally:
        destination.unlink(missing_ok=True)


def test_upload_batch_limit_is_bounded():
    uploads = [UploadFile(filename=f"{index}.pdf", file=io.BytesIO(b"%PDF-")) for index in range(MAX_FILES_PER_REQUEST + 1)]
    with pytest.raises(HTTPException) as error:
        _validate_file_batch(uploads)
    assert error.value.status_code == 413


class _Rows:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class _BulkBalanceDb:
    def execute(self, _query):
        return _Rows([(1, 2)])

    def scalars(self, _query):
        return _Rows([])


def test_bulk_leave_balances_use_custom_annual_entitlement():
    employee = Employee(
        id=1,
        name="Test Employee",
        passport_id="test",
        annual_leave_days=20,
        startup_data={"Contract Status": {"status": "Permanent", "date": "2020-01-01"}},
    )
    balances = _bulk_annual_leave_balances(_BulkBalanceDb(), [employee])
    expected_entitlement = _months_employed(date(2020, 1, 1)) * (20 / 12)
    assert balances[1] == (expected_entitlement, expected_entitlement - 2)
    assert _bulk_sick_leave_balances(_BulkBalanceDb(), [employee])[1] == (30, 30)


class _FailingCommitDb:
    def get(self, _model, _employee_id):
        return Employee(id=1, name="Test Employee", passport_id="test", startup_data={})

    def add_all(self, _items):
        pass

    def commit(self):
        raise RuntimeError("database commit failed")

    def rollback(self):
        pass


class _MultipartDb:
    def __init__(self):
        self.employee = Employee(id=1, name="Test Employee", passport_id="test", startup_data={})
        self.leaves = {}
        self.next_id = 1
        self.fail_commit = False
        self._snapshot = None

    def get(self, model, object_id):
        if model is Employee:
            return self.employee if object_id == self.employee.id else None
        if model is SickLeave:
            leave = self.leaves.get(object_id)
            if leave is not None:
                self._snapshot = {
                    "start_date": leave.start_date,
                    "end_date": leave.end_date,
                    "reason": leave.reason,
                    "days_used": leave.days_used,
                    "medical_cert": leave.medical_cert,
                    "status": leave.status,
                }
            return leave
        return None

    def add(self, obj):
        if isinstance(obj, SickLeave) and obj.id is None:
            obj.id = self.next_id
            self.next_id += 1
            self.leaves[obj.id] = obj

    def commit(self):
        if self.fail_commit:
            raise RuntimeError("database commit failed")

    def refresh(self, _obj):
        pass

    def rollback(self):
        if self._snapshot and self.leaves:
            leave = next(iter(self.leaves.values()))
            for key, value in self._snapshot.items():
                setattr(leave, key, value)


async def _multipart_request(app, method, path, *, data, files):
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, path, data=data, files=files)


def _override_app_dependencies(db):
    main_module.app.dependency_overrides[get_db] = lambda: db
    main_module.app.dependency_overrides[get_current_user] = lambda: object()


def test_multipart_create_and_update_save_and_replace_medical_cert(monkeypatch):
    upload_root = Path(".test-medical-certs")
    shutil.rmtree(upload_root, ignore_errors=True)
    upload_root.mkdir()
    monkeypatch.setattr(main_module, "UPLOAD_DIR", upload_root)
    db = _MultipartDb()
    _override_app_dependencies(db)
    try:
        create_response = asyncio.run(
            _multipart_request(
                main_module.app,
                "POST",
                "/api/sick-leave",
                data={
                    "employee_id": "1",
                    "start_date": "2026-01-01",
                    "end_date": "2026-01-02",
                    "reason": "medical",
                    "days_used": "1",
                    "status": "Approved",
                },
                files={"medical_cert_file": ("first.pdf", b"%PDF-1.7 first", "application/pdf")},
            )
        )
        assert create_response.status_code == 201, create_response.text
        first_filename = create_response.json()["medical_cert"]
        first_path = upload_root / first_filename
        assert first_filename and first_path.exists()
        assert db.leaves[1].medical_cert == first_filename

        update_response = asyncio.run(
            _multipart_request(
                main_module.app,
                "PUT",
                "/api/sick-leave/1",
                data={
                    "start_date": "2026-01-03",
                    "end_date": "2026-01-04",
                    "reason": "updated",
                    "days_used": "0.5",
                    "status": "Pending",
                },
                files={"medical_cert_file": ("replacement.pdf", b"%PDF-1.7 replacement", "application/pdf")},
            )
        )
        assert update_response.status_code == 200, update_response.text
        replacement_filename = update_response.json()["medical_cert"]
        assert replacement_filename and replacement_filename != first_filename
        assert (upload_root / replacement_filename).exists()
        assert not first_path.exists()
        assert db.leaves[1].medical_cert == replacement_filename
    finally:
        main_module.app.dependency_overrides.clear()
        shutil.rmtree(upload_root, ignore_errors=True)


def test_multipart_medical_cert_is_cleaned_when_update_commit_fails(monkeypatch):
    upload_root = Path(".test-medical-cert-failure")
    shutil.rmtree(upload_root, ignore_errors=True)
    upload_root.mkdir()
    monkeypatch.setattr(main_module, "UPLOAD_DIR", upload_root)
    db = _MultipartDb()
    _override_app_dependencies(db)
    try:
        create_response = asyncio.run(
            _multipart_request(
                main_module.app,
                "POST",
                "/api/sick-leave",
                data={
                    "employee_id": "1",
                    "start_date": "2026-01-01",
                    "end_date": "2026-01-02",
                    "days_used": "1",
                    "status": "Approved",
                },
                files={"medical_cert_file": ("original.pdf", b"%PDF-1.7 original", "application/pdf")},
            )
        )
        assert create_response.status_code == 201
        original_filename = create_response.json()["medical_cert"]
        db.fail_commit = True
        failed_response = asyncio.run(
            _multipart_request(
                main_module.app,
                "PUT",
                "/api/sick-leave/1",
                data={
                    "start_date": "2026-01-03",
                    "end_date": "2026-01-04",
                    "days_used": "1",
                    "status": "Approved",
                },
                files={"medical_cert_file": ("failed.pdf", b"%PDF-1.7 failed", "application/pdf")},
            )
        )
        assert failed_response.status_code == 500
        assert db.leaves[1].medical_cert == original_filename
        assert sorted(path.name for path in upload_root.iterdir()) == [original_filename]
    finally:
        main_module.app.dependency_overrides.clear()
        shutil.rmtree(upload_root, ignore_errors=True)


def test_contract_upload_cleans_files_when_database_commit_fails(monkeypatch):
    upload_root = Path(".test-upload-commit-failure")
    shutil.rmtree(upload_root, ignore_errors=True)
    upload_root.mkdir()
    monkeypatch.setattr(main_module, "UPLOAD_DIR", upload_root)
    upload = UploadFile(filename="contract.pdf", file=io.BytesIO(b"%PDF-" + b"x" * 20))

    try:
        with pytest.raises(RuntimeError):
            asyncio.run(upload_contract_file(1, [upload], object(), _FailingCommitDb()))
        assert list(upload_root.iterdir()) == []
    finally:
        shutil.rmtree(upload_root, ignore_errors=True)
