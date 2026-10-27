# ShopCart — Project Rules & Architectural Constraints

## 1. Project Context & Identity
- **Project Name:** ShopCart
- **Evaluation:** Tech Challenge 360 (Grupo Pentandra) — Full Stack Senior Level
- **Repository:** https://github.com/Crstndfp/ShopCart.git
- **Author Email:** thecris.danny@gmail.com

---

## 2. Language & Documentation Constraints
- **Language Standard:**
  - All source code (Backend, Frontend), TypeScript interfaces, variable names, database scripts, Stored Procedures, API contracts, commit messages, and automated tests **MUST be written in English**.
  - **Exception:** The root [`README.md`](file:///home/cflores/Sources/repos/ShopCart/README.md) is the **ONLY** document written in Spanish (as requested by the evaluation criteria).

---

## 3. Database & Persistence Standards (SQL Server 2019+)
- **Strictly No ORMs:** Direct disqualification / penalization if Prisma, TypeORM, Sequelize, or Drizzle are used for data access queries.
- **Stored Procedures Only:** All database interactions (Create, Read, Update, Delete) must execute dedicated Stored Procedures with typed parameters.
- **SQL Injection Prevention:** Never concatenate dynamic SQL strings. Always bind typed parameters using the native MSSQL driver.
- **Naming Conventions:**
  - Primary Keys: `ID<Entity>` (e.g. `IDProduct`, `IDOrder`, `IDCart`, `IDCoupon`, `IDUser`).
  - Stored Procedures: `SP_Module_Process` (e.g. `SP_Orders_CreateOrder`, `SP_Inventory_ReserveStock`).
  - Views: `VW_Module_Process` (e.g. `VW_Dashboard_SalesByCategory`).
  - Table Functions: `FU_Module_Process` (e.g. `FU_Coupons_CalculateDiscount`).
- **Data Types:** Strict `DECIMAL(12,2)` for all monetary figures and `INTEGER` for quantities. `FLOAT` and `REAL` are strictly prohibited.

---

## 4. Core Business & Architecture Rules
- **Layered Architecture:**
  1. Routes / Controllers (HTTP transport, request validation using Zod).
  2. Domain Services (Business logic orchestration).
  3. Data Access Layer (MSSQL driver executing Stored Procedures).
- **Concurrency & ACID:**
  - Checkout, coupon redemptions, and inventory updates must use pessimistic locks (`UPDLOCK`, `HOLDLOCK`) to guarantee zero overselling.
  - Checkout is atomic: Order header, line items, Kardex movements, and coupon usages succeed together or rollback completely.
- **Idempotency:**
  - Order creation must require an `Idempotency-Key` to avoid double-charging or duplicate orders.
- **15-Minute Reservations:**
  - When initiating checkout, stock is temporarily held for 15 minutes.
  - Expired reservations are automatically released by a background worker (`node-cron`) executing `SP_Inventory_ReleaseExpiredReservations`.
- **Customer Tenant Isolation:**
  - Validations in backend controllers must guarantee that changing an ID in the URL or body does not expose or mutate another customer's cart, orders, or addresses (returns `403 Forbidden` / `404 Not Found`).
- **Token Security:**
  - Short-lived JWT access tokens (15m) + rotating refresh tokens with token family reuse detection (revoking compromised families).

---

## 5. Git Workflow & Commit Standards
- **Branch Strategy:**
  - `main`: Production-ready release branch.
  - `develop`: Ongoing development integration branch.
  - `feature/<feature-name>`: Scoped atomic feature branches off `develop`.
- **Commit Format:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Progressive Commits:** Commits must be atomic, legible, and progressive. A single massive commit at the end is penalized.
