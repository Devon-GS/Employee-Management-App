<div align="center">

# 🏢 StaffFlow | Employee Management System

**An enterprise-grade HR, Compliance, and Leave Management Platform tailored for forecourt, retail, and service operations.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_Alpine-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![OpenPyXL](https://img.shields.io/badge/OpenPyXL-Automated_Docs-217346?style=for-the-badge&logo=microsoftexcel&logoColor=white)](https://openpyxl.readthedocs.io)

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-environment-variables">Configuration</a> •
  <a href="#-api-documentation">API Reference</a>
</p>

</div>

---

## 📖 Overview

**StaffFlow** is a specialized HR management platform designed to streamline employee onboarding, statutory document compliance, uniform issuance tracking, and labor-law-compliant leave accrual. 

Built with compliance in mind (including provisions for **MIBCO**, **UIF**, and South African Basic Conditions of Employment regulations), it bridges the gap between digital data storage and operational physical documentation through automated Excel sheet generation and Word document templating.

---

## ✨ Key Features

### 📋 Interactive Onboarding & Startup Checklist
- Standardized startup workflows tracking:
  - Employment contracts & status history
  - South African ID / Work Permit validation & expiry tracking
  - Statutory registrations (**UIF**, **MIBCO**)
  - Bank details, disciplinary registers, and training packs.
- Audit-friendly state management with complete history tracking.

### 🌴 Intelligent Leave Engine (BCEA & MIBCO Compliant)
- **Annual Leave Automation:**
  - Dynamic accrual calculated from permanent employment start dates.
  - Granular accrual formulas (standard `1.25` days/month or custom rate adjustments).
- **Sick Leave Cycle Calculator:**
  - **First 6 Months (Probation):** Automatic 1 day accrued per 26 days worked.
  - **36-Month Cycle:** 30 days statutory sick leave pool calculation with rolling 3-year cycle resets.
  - Mandatory medical certificate uploads (`.pdf`, `.jpg`, `.png`, `.docx`) with embedded in-browser viewer.
- **Aggregated Reporting:** Real-time summary endpoints delivering fleet-wide balances, used days, and active requests.

### 👔 Automated Uniform Issuance & Care Letters
- **Dynamic Excel Generation:** In-memory modification and saving of official `ISSUE-Uniforms.xlsx` sheets using **openpyxl**.
- **Department-Specific Templates:** Automated document delivery for **Forecourt**, **Cashier**, **Baker**, and **Car Wash** divisions.
- Item tracking for shoes, jackets, beanies, pump tags, and name badges.

### 📁 Centralized Compliance Vault
- Employee digital profile housing contracts, IDs, bank statements, written warnings, and care letters.
- Streaming document viewer (`inline` headers) allowing instant preview without forced downloads.
- Clean soft-delete and restore capabilities for archived personnel.

---

## 🏗 System Architecture

```text
                             ┌───────────────────────┐
                             │    Client Browser     │
                             └──────────┬────────────┘
                                        │
                         HTTP Requests  │  Port 3000 / 8000
                                        ▼
    ┌────────────────────────── Docker Network ──────────────────────────┐
    │                                                                    │
    │   ┌─────────────────────┐                 ┌────────────────────┐   │
    │   │  Frontend (Nginx)   │ ──(Reverse)───► │  FastAPI Backend   │   │
    │   │   [Port 3000:80]    │    Proxy/API    │    [Port 8000]     │   │
    │   └─────────────────────┘                 └─────────┬──────────┘   │
    │                                                     │              │
    │                             ┌───────────────────────┼──────────┐   │
    │                             │                       │          │   │
    │                             ▼                       ▼          ▼   │
    │                    ┌────────────────┐    ┌───────────────┐ ┌─────┐ │
    │                    │ PostgreSQL 16  │    │ Upload Volume │ │XLSX/│ │
    │                    │ [Port 5432]    │    │ (/app/uploads)│ │DOCX │ │
    │                    └────────────────┘    └───────────────┘ └─────┘ │
    └────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) |
| **ORM & Database** | [SQLAlchemy](https://www.sqlalchemy.org/) + [PostgreSQL 16](https://www.postgresql.org/) |
| **Security & Auth** | OAuth2 Bearer Tokens (JWT), Passlib / Bcrypt |
| **Office Automation**| [OpenPyXL](https://openpyxl.readthedocs.io) (Excel manipulation) |
| **Frontend** | Modern SPA (Containerized Nginx serving static build) |
| **Containerization**| Docker & Docker Compose |

---

## 🚀 Quick Start

### 1. Prerequisites
- [Docker Engine](https://docs.docker.com/engine/install/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.0+)

### 2. Clone and Configure
```bash
git clone https://github.com/your-org/employee-management-app.git
cd employee-management-app
```

Create your `.env` configuration file in the project root:
```bash
cp .env.example .env
```

### 3. Spin Up the Stack
```bash
docker compose up -d --build
```

### 4. Verify Services
Once running, verify the containers are operational:
```bash
docker compose ps
```

| Service | Address | Description |
| :--- | :--- | :--- |
| **Frontend Web UI** | `http://localhost:3000` | Administrative Dashboard |
| **Backend API** | `http://localhost:8000` | REST API Engine |
| **Swagger UI** | `http://localhost:8000/docs` | Interactive API documentation |
| **ReDoc UI** | `http://localhost:8000/redoc` | OpenAPI Schema Specs |
| **PostgreSQL** | `localhost:5432` | Relational Database Engine |

---

## ⚙️ Environment Variables

Configure these settings inside your `.env` file:

```dotenv
# Database Configuration
DB_PASSWORD=your_super_secret_db_password
DATABASE_URL=postgresql+psycopg2://manager:${DB_PASSWORD}@db:5432/employee_app

# Security & Authentication
JWT_SECRET_KEY=generate_a_secure_random_hex_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# File Storage Configuration
UPLOAD_DIR=/app/uploads
TEMPLATE_DIR=/app/Document Templates
```

> [!NOTE]
> Generate a strong JWT secret using Python:
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## 🔐 Default Credentials

Upon running migrations on container startup, the application initializes a default root account:

- **Username:** `admin`
- **Password:** `admin`

> [!WARNING]
> Please navigate to `/api/change-password` or use the UI settings to update this password immediately upon first deployment.

---

## 📡 API Reference Overview

The API follows standard RESTful design with structured JSON responses.

### 🧑‍💼 Employee Management
- `GET /api/employees` — List all active employees.
- `POST /api/employees` — Register an employee (unique ID/Passport required).
- `GET /api/employees/{id}/profile` — Aggregated profile with leave metrics & permit data.
- `POST /api/employees/{id}/archive` — Soft-archive an employee.
- `POST /api/employees/{id}/restore` — Restore an archived employee.

### ✅ Onboarding & Checklists
- `GET /api/employees/{id}/startup` — Fetch the onboarding checklist.
- `PUT /api/employees/{id}/startup` — Update verification tasks, permit statuses, & UIF numbers.

### 🥼 Uniform Logistics
- `POST /api/employees/{id}/documents/uniform_issue/save` — Parse, populate, and save the uniform spreadsheet.
- `GET /api/employees/{id}/uniform-issue-workbook` — Read uniform distribution state.
- `GET /api/employees/{id}/uniform-care-letter/download` — Download department-specific care agreement.

### 🏖 Leave Administration
- `GET /api/annual-leave` — View leave schedules & filter by employee.
- `POST /api/annual-leave` — Request annual leave.
- `POST /api/sick-leave` — Log sick leave with multipart medical certificate uploads.
- `GET /api/employee-leave/report` — Company-wide calculated leave liability report.

---

## 📁 Project Structure

```text
├── backend/
│   ├── main.py              # Application factory, endpoints, and leave logic
│   ├── models.py            # SQLAlchemy relational models
│   ├── schemas.py           # Pydantic request/response validations
│   ├── database.py          # Session engines & DB initialization
│   ├── auth.py              # JWT authentication & hashing utils
│   └── Dockerfile           # Backend container build instructions
├── frontend/
│   ├── src/                 # SPA UI components & state stores
│   ├── nginx.conf           # Reverse proxy configuration
│   └── Dockerfile           # Multi-stage frontend container build
├── Document Templates/      # Static templates
│   ├── ISSUE-Uniforms.xlsx
│   ├── UNIFORM CARE LETTER-Forecourt.docx
│   └── UNIFORM CARE LETTER-Cashiers-Bakers.docx
├── docker-compose.yml       # Container orchestration spec
└── README.md
```

---

## 🛡 Security & Best Practices

- **Zero-Storage Orphan Deletions:** Custom FastAPI `BackgroundTasks` delete underlying binary files from the storage volume when records are deleted in the database.
- **MIME & Extension Whitelisting:** Enforces strict upload validation on contracts and medical certificates to mitigate arbitrary file execution attacks.
- **Non-destructive Archiving:** Full employee audit records are retained upon departure, freezing leave calculations without breaking relational ties.

---

<!-- ## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information. -->
