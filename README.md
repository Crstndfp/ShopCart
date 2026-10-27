# ShopCart — Enterprise E-Commerce Platform

Enterprise-grade e-commerce web platform developed as part of **Tech Challenge 360 (Grupo Pentandra)**.

ShopCart provides a high-performance, ACID-compliant sales platform featuring real-time stock reservations, concurrency-safe checkout, multi-tier auditing, and server-side reporting.

---

## Technical Stack & Architecture

- **Database:** Microsoft SQL Server 2019+ (Dockerized, strict normalization, Stored Procedures for all data access, zero ORM, atomic transactions with `UPDLOCK`/`HOLDLOCK`).
- **Backend:** Node.js 24 LTS + Express + TypeScript (Strict mode, layered architecture: Routes/Controllers -> Services -> Data Access Layer with typed MSSQL parameters).
- **Frontend:** React 18+ + TypeScript + Vite (Role-based access control, server-side tables, real-time charts, transparent token rotation).
- **Security & Integrity:** Argon2 password hashing, short-lived JWTs + rotating refresh tokens, strict client tenant data isolation, parameterized execution preventing SQL injection.

---

## Repository Structure

```text
ShopCart/
├── docs/                        # Architecture Decision Records (ADRs) & documentation
│   └── architecture/
│       └── ADR-001-data-model-and-configuration.md
├── database/                    # Versioned, reproducible SQL scripts
│   ├── 01_tables_constraints.sql
│   ├── 02_views.sql
│   ├── 03_functions.sql
│   ├── 04_stored_procedures.sql
│   └── 05_seed_data.sql
├── backend/                     # Node.js 24 LTS Express API (TypeScript strict)
├── frontend/                    # React 18 SPA (TypeScript)
├── docker-compose.yml           # SQL Server 2022 container with automatic setup
├── .env.example                 # Environment variables template
└── README.md                    # Project documentation
```

---

## Documentation & ADRs

- [ADR 001: Data Model, Configurations, and Lookup Catalog](docs/architecture/ADR-001-data-model-and-configuration.md)
