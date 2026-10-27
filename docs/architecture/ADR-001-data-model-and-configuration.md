---
project: ShopCart
date: 2026-10-27
type: architecture
tags: [database, erd, sql-server, configuration, data-dictionary]
---

# ADR 001: Data Model, System Configuration, and Master Values Catalog

## 1. Context and Problem Statement
The ShopCart platform requires a fully normalized relational database in Microsoft SQL Server 2019+, strictly complying with ACID transaction guarantees, concurrency control (no overselling), auditability, automatic 15-minute reservation expiration, and 12% IVA tax compliance.

To avoid hardcoded operational parameters (such as the 12% IVA rate, 15-minute checkout reservation timeout, 24-hour abandoned cart threshold, token lifespans) and to formalize discrete domain states (roles, order states, kardex movement types, coupon discount types), we need:
1. A centralized `Configurations` table for runtime operational parameters.
2. A `Values` (Master Lookup) table for discrete business domain enumerations.
3. A fully normalized Entity-Relationship Model supporting all functional requirements (RF-01 through RF-09).

## 2. Architectural Decisions

### 2.1 System Configuration Table (`Configurations`)
Stores strongly-typed runtime key-value parameters governed by administrators without requiring code redeployment:
- `SYSTEM_IVA_PERCENTAGE`: `0.12` (12% IVA included in prices)
- `SYSTEM_CURRENCY_ISO`: `'GTQ'` (Guatemalan Quetzales)
- `INVENTORY_RESERVATION_MINUTES`: `15` (Hold duration during checkout)
- `CART_ABANDONED_HOURS`: `24` (Inactivity threshold for abandoned cart analytics)
- `AUTH_ACCESS_TOKEN_MINUTES`: `15`
- `AUTH_REFRESH_TOKEN_DAYS`: `7`

### 2.2 Master Values / Domain Lookup Table (`Values`)
Standardizes all discrete codes and statuses under a single extensible lookup table:
- `USER_ROLE`: `CLIENT`, `OPERATOR`, `ADMINISTRATOR`
- `ORDER_STATUS`: `PAYMENT_PENDING`, `PAID`, `IN_PREPARATION`, `DISPATCHED`, `DELIVERED`, `CANCELLED`, `PARTIALLY_RETURNED`, `FULLY_RETURNED`
- `KARDEX_MOVEMENT_TYPE`: `PURCHASE_ENTRY`, `SALE_EXIT`, `POSITIVE_ADJUSTMENT`, `NEGATIVE_ADJUSTMENT`, `CLIENT_RETURN`
- `RESERVATION_STATUS`: `ACTIVE`, `COMPLETED`, `EXPIRED`, `CANCELLED`
- `COUPON_DISCOUNT_TYPE`: `PERCENTAGE`, `FIXED_AMOUNT`
- `AUDIT_ACTION`: `CREATE`, `UPDATE`, `DEACTIVATE`

### 2.3 SQL Server Standards Compliance
- **Primary Keys**: `ID<Entity>` format (e.g. `IDProduct`, `IDOrder`, `IDCoupon`, `IDConfiguration`, `IDValue`).
- **Stored Procedures**: `SP_Module_Process` (e.g. `SP_Orders_CreateOrder`, `SP_Inventory_ReserveStock`).
- **Views**: `VW_Module_Process` (e.g. `VW_Dashboard_SalesByCategory`).
- **Table-Valued Functions**: `FU_Module_Process` (e.g. `FU_Coupons_CalculateDiscount`).
- **Monetary & Numeric Precision**: Strict `DECIMAL(12,2)` and `INTEGER`. `FLOAT` and `REAL` are strictly prohibited.
- **Data Access**: 100% through Stored Procedures with typed parameters. Zero ORMs and zero raw SQL strings.

## 3. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    CONFIGURATIONS {
        int IDConfiguration PK
        varchar ConfigKey UK
        nvarchar ConfigValue
        varchar DataType
        nvarchar Description
        bit IsEditable
        datetime2 UpdatedAt
        int UpdatedByUserID FK
    }

    VALUES_LOOKUP {
        int IDValue PK
        varchar ValueCategory
        varchar Code
        nvarchar Name
        nvarchar Description
        int DisplayOrder
        bit IsActive
    }

    USERS {
        int IDUser PK
        int IDRole FK
        nvarchar FullName
        varchar Email UK
        varchar PasswordHash
        varchar PhoneNumber
        bit IsActive
        datetime2 CreatedAt
        datetime2 UpdatedAt
    }

    REFRESH_TOKENS {
        int IDRefreshToken PK
        int IDUser FK
        varchar TokenHash UK
        datetime2 ExpiresAt
        bit IsRevoked
        varchar ReplacedByTokenHash
        datetime2 CreatedAt
    }

    ADDRESSES {
        int IDAddress PK
        int IDUser FK
        nvarchar Alias
        nvarchar RecipientName
        nvarchar AddressLine1
        nvarchar AddressLine2
        nvarchar Municipality
        nvarchar Department
        varchar PostalCode
        varchar ContactPhone
        bit IsActive
    }

    CATEGORIES {
        int IDCategory PK
        int IDParentCategory FK
        nvarchar Name UK
        nvarchar Description
        bit IsActive
        datetime2 CreatedAt
    }

    PRODUCTS {
        int IDProduct PK
        int IDCategory FK
        nvarchar Name
        nvarchar Description
        nvarchar MainImageUrl
        bit IsActive
        datetime2 CreatedAt
        datetime2 UpdatedAt
    }

    PRODUCT_VARIANTS {
        int IDVariant PK
        int IDProduct FK
        varchar SKU UK
        nvarchar AttributesJson
        decimal Price
        int PhysicalStock
        bit IsActive
        datetime2 CreatedAt
        datetime2 UpdatedAt
    }

    CARTS {
        int IDCart PK
        int IDUser FK
        varchar GuestToken UK
        datetime2 CreatedAt
        datetime2 LastActivityAt
        bit IsActive
    }

    CART_ITEMS {
        int IDCartItem PK
        int IDCart FK
        int IDVariant FK
        int Quantity
        datetime2 AddedAt
    }

    STOCK_RESERVATIONS {
        int IDReservation PK
        int IDVariant FK
        int IDCart FK
        int Quantity
        datetime2 ReservedAt
        datetime2 ExpiresAt
        varchar Status
        int IDOrder FK
    }

    COUPONS {
        int IDCoupon PK
        varchar Code UK
        varchar DiscountType
        decimal DiscountValue
        decimal MinPurchaseAmount
        datetime2 StartDate
        datetime2 EndDate
        int MaxTotalUses
        int CurrentUses
        int MaxUsesPerClient
        int IDCategory FK
        bit IsActive
    }

    COUPON_USAGES {
        int IDCouponUsage PK
        int IDCoupon FK
        int IDUser FK
        int IDOrder FK
        decimal DiscountApplied
        datetime2 UsedAt
    }

    ORDERS {
        int IDOrder PK
        varchar OrderNumber UK
        int IDUser FK
        int IDDeliveryAddress FK
        nvarchar ShippingAddressSnapshot
        decimal NetSubtotal
        decimal IVATaxAmount
        decimal DiscountTotal
        decimal GrandTotal
        int IDCoupon FK
        varchar Status
        varchar IdempotencyKey UK
        datetime2 CreatedAt
        datetime2 UpdatedAt
    }

    ORDER_ITEMS {
        int IDOrderItem PK
        int IDOrder FK
        int IDVariant FK
        varchar HistoricalSKU
        nvarchar HistoricalProductName
        decimal UnitPrice
        int QuantitySold
        int QuantityReturned
        decimal LineTotal
    }

    ORDER_STATUS_HISTORY {
        int IDOrderStatusHistory PK
        int IDOrder FK
        varchar PreviousStatus
        varchar NewStatus
        int IDUser FK
        nvarchar Reason
        datetime2 ChangedAt
    }

    RETURNS {
        int IDReturn PK
        int IDOrder FK
        int IDOperatorUser FK
        nvarchar Reason
        decimal TotalRefundAmount
        datetime2 CreatedAt
    }

    RETURN_ITEMS {
        int IDReturnItem PK
        int IDReturn FK
        int IDOrderItem FK
        int QuantityReturned
        decimal RefundedAmount
    }

    KARDEX {
        int IDKardex PK
        int IDVariant FK
        varchar MovementType
        int Quantity
        int PreviousBalance
        int NewBalance
        nvarchar Reason
        int IDUser FK
        int IDOrder FK
        datetime2 MovementDate
    }

    AUDIT_LOG {
        int IDAuditLog PK
        int IDUser FK
        varchar Module
        varchar EntityName
        varchar EntityID
        varchar ActionType
        nvarchar PreviousValueJson
        nvarchar NewValueJson
        datetime2 LoggedAt
    }

    USERS ||--o{ REFRESH_TOKENS : "has"
    USERS ||--o{ ADDRESSES : "owns"
    USERS ||--o{ CARTS : "owns"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ COUPON_USAGES : "redeems"
    USERS ||--o{ KARDEX : "executes"
    USERS ||--o{ AUDIT_LOG : "triggers"

    CATEGORIES ||--o{ CATEGORIES : "subcategories"
    CATEGORIES ||--o{ PRODUCTS : "contains"
    CATEGORIES ||--o{ COUPONS : "restricts"

    PRODUCTS ||--o{ PRODUCT_VARIANTS : "composed_of"

    PRODUCT_VARIANTS ||--o{ CART_ITEMS : "added_to"
    PRODUCT_VARIANTS ||--o{ STOCK_RESERVATIONS : "held_by"
    PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : "sold_in"
    PRODUCT_VARIANTS ||--o{ KARDEX : "tracked_in"

    CARTS ||--o{ CART_ITEMS : "holds"
    CARTS ||--o{ STOCK_RESERVATIONS : "initiates"

    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDERS ||--o{ ORDER_STATUS_HISTORY : "tracks"
    ORDERS ||--o{ COUPON_USAGES : "applies"
    ORDERS ||--o{ RETURNS : "generates"
    ORDERS ||--o{ STOCK_RESERVATIONS : "fulfills"

    RETURNS ||--o{ RETURN_ITEMS : "details"
    ORDER_ITEMS ||--o{ RETURN_ITEMS : "refunded_item"
    COUPONS ||--o{ COUPON_USAGES : "recorded_in"
```
