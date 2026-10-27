-- ============================================================================
-- Script 01: Create Database, Schemas, and Tables with Constraints
-- Project: ShopCart (Tech Challenge 360 - Grupo Pentandra)
-- DBMS: Microsoft SQL Server 2019+
-- Standards: Strict typing, DECIMAL/INT, PK ID<Entity>, Normalized
-- ============================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ShopCartDB')
BEGIN
    CREATE DATABASE ShopCartDB COLLATE Latin1_General_100_CI_AS_SC_UTF8;
END
GO

USE ShopCartDB;
GO

-- ============================================================================
-- 1. SYSTEM CONFIGURATION & VALUES CATALOG (Lookup Tables)
-- ============================================================================

IF OBJECT_ID(N'dbo.Configurations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Configurations (
        IDConfiguration INT IDENTITY(1,1) NOT NULL,
        ConfigKey VARCHAR(50) NOT NULL,
        ConfigValue NVARCHAR(255) NOT NULL,
        DataType VARCHAR(20) NOT NULL,
        Description NVARCHAR(255) NOT NULL,
        IsEditable BIT NOT NULL CONSTRAINT DF_Configurations_IsEditable DEFAULT 1,
        UpdatedAt DATETIME2(3) NULL,
        UpdatedByUserID INT NULL,
        CONSTRAINT PK_Configurations PRIMARY KEY CLUSTERED (IDConfiguration),
        CONSTRAINT UQ_Configurations_ConfigKey UNIQUE (ConfigKey),
        CONSTRAINT CK_Configurations_DataType CHECK (DataType IN ('DECIMAL', 'INTEGER', 'TEXT', 'BOOLEAN', 'JSON'))
    );
END
GO

IF OBJECT_ID(N'dbo.ValuesLookup', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ValuesLookup (
        IDValue INT IDENTITY(1,1) NOT NULL,
        ValueCategory VARCHAR(50) NOT NULL,
        Code VARCHAR(50) NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(255) NULL,
        DisplayOrder INT NOT NULL CONSTRAINT DF_ValuesLookup_DisplayOrder DEFAULT 0,
        IsActive BIT NOT NULL CONSTRAINT DF_ValuesLookup_IsActive DEFAULT 1,
        CONSTRAINT PK_ValuesLookup PRIMARY KEY CLUSTERED (IDValue),
        CONSTRAINT UQ_ValuesLookup_Category_Code UNIQUE (ValueCategory, Code)
    );
END
GO

-- ============================================================================
-- 2. USERS, ROLES, REFRESH TOKENS, AND ADDRESSES (RF-01)
-- ============================================================================

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        IDUser INT IDENTITY(1,1) NOT NULL,
        IDRole INT NOT NULL,
        FullName NVARCHAR(150) NOT NULL,
        Email VARCHAR(150) NOT NULL,
        PasswordHash VARCHAR(255) NOT NULL,
        PhoneNumber VARCHAR(30) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (IDUser),
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT FK_Users_Role FOREIGN KEY (IDRole) REFERENCES dbo.ValuesLookup (IDValue)
    );
END
GO

-- Add FK from Configurations to Users now that Users exists
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Configurations_User')
BEGIN
    ALTER TABLE dbo.Configurations
    ADD CONSTRAINT FK_Configurations_User FOREIGN KEY (UpdatedByUserID) REFERENCES dbo.Users (IDUser);
END
GO

IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshTokens (
        IDRefreshToken INT IDENTITY(1,1) NOT NULL,
        IDUser INT NOT NULL,
        TokenHash VARCHAR(128) NOT NULL,
        ExpiresAt DATETIME2(3) NOT NULL,
        IsRevoked BIT NOT NULL CONSTRAINT DF_RefreshTokens_IsRevoked DEFAULT 0,
        ReplacedByTokenHash VARCHAR(128) NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_RefreshTokens PRIMARY KEY CLUSTERED (IDRefreshToken),
        CONSTRAINT UQ_RefreshTokens_TokenHash UNIQUE (TokenHash),
        CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser) ON DELETE CASCADE
    );
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_IDUser ON dbo.RefreshTokens (IDUser);
END
GO

IF OBJECT_ID(N'dbo.Addresses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Addresses (
        IDAddress INT IDENTITY(1,1) NOT NULL,
        IDUser INT NOT NULL,
        Alias NVARCHAR(50) NOT NULL,
        RecipientName NVARCHAR(150) NOT NULL,
        AddressLine1 NVARCHAR(200) NOT NULL,
        AddressLine2 NVARCHAR(200) NULL,
        Municipality NVARCHAR(100) NOT NULL,
        Department NVARCHAR(100) NOT NULL,
        PostalCode VARCHAR(20) NULL,
        ContactPhone VARCHAR(30) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Addresses_IsActive DEFAULT 1,
        CONSTRAINT PK_Addresses PRIMARY KEY CLUSTERED (IDAddress),
        CONSTRAINT FK_Addresses_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser)
    );
    CREATE NONCLUSTERED INDEX IX_Addresses_IDUser ON dbo.Addresses (IDUser);
END
GO

-- ============================================================================
-- 3. CATEGORIES, PRODUCTS, AND VARIANTS (RF-02)
-- ============================================================================

IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        IDCategory INT IDENTITY(1,1) NOT NULL,
        IDParentCategory INT NULL,
        Name NVARCHAR(100) NOT NULL,
        Description NVARCHAR(255) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Categories_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Categories PRIMARY KEY CLUSTERED (IDCategory),
        CONSTRAINT UQ_Categories_Name UNIQUE (Name),
        CONSTRAINT FK_Categories_Parent FOREIGN KEY (IDParentCategory) REFERENCES dbo.Categories (IDCategory)
    );
END
GO

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products (
        IDProduct INT IDENTITY(1,1) NOT NULL,
        IDCategory INT NOT NULL,
        Name NVARCHAR(150) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        MainImageUrl NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Products_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Products PRIMARY KEY CLUSTERED (IDProduct),
        CONSTRAINT FK_Products_Category FOREIGN KEY (IDCategory) REFERENCES dbo.Categories (IDCategory)
    );
    CREATE NONCLUSTERED INDEX IX_Products_IDCategory ON dbo.Products (IDCategory);
END
GO

IF OBJECT_ID(N'dbo.ProductVariants', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductVariants (
        IDVariant INT IDENTITY(1,1) NOT NULL,
        IDProduct INT NOT NULL,
        SKU VARCHAR(50) NOT NULL,
        AttributesJson NVARCHAR(500) NOT NULL,
        Price DECIMAL(12,2) NOT NULL,
        PhysicalStock INT NOT NULL CONSTRAINT DF_ProductVariants_PhysicalStock DEFAULT 0,
        IsActive BIT NOT NULL CONSTRAINT DF_ProductVariants_IsActive DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ProductVariants_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NULL,
        CONSTRAINT PK_ProductVariants PRIMARY KEY CLUSTERED (IDVariant),
        CONSTRAINT UQ_ProductVariants_SKU UNIQUE (SKU),
        CONSTRAINT FK_ProductVariants_Product FOREIGN KEY (IDProduct) REFERENCES dbo.Products (IDProduct),
        CONSTRAINT CK_ProductVariants_Price CHECK (Price >= 0),
        CONSTRAINT CK_ProductVariants_Stock CHECK (PhysicalStock >= 0)
    );
    CREATE NONCLUSTERED INDEX IX_ProductVariants_IDProduct ON dbo.ProductVariants (IDProduct);
END
GO

-- ============================================================================
-- 4. SHOPPING CARTS AND CART ITEMS (RF-04)
-- ============================================================================

IF OBJECT_ID(N'dbo.Carts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Carts (
        IDCart INT IDENTITY(1,1) NOT NULL,
        IDUser INT NULL,
        GuestToken VARCHAR(100) NULL,
        Status VARCHAR(20) NOT NULL CONSTRAINT DF_Carts_Status DEFAULT 'ACTIVE',
        IsActive BIT NOT NULL CONSTRAINT DF_Carts_IsActive DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Carts_CreatedAt DEFAULT SYSUTCDATETIME(),
        LastActivityAt DATETIME2(3) NOT NULL CONSTRAINT DF_Carts_LastActivityAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Carts PRIMARY KEY CLUSTERED (IDCart),
        CONSTRAINT FK_Carts_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser),
        CONSTRAINT CK_Carts_Owner CHECK (IDUser IS NOT NULL OR GuestToken IS NOT NULL),
        CONSTRAINT CK_Carts_Status CHECK (Status IN ('ACTIVE', 'CONVERTED', 'ABANDONED'))
    );

    -- Enforce only 1 active cart per authenticated user
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Carts_ActiveUser 
    ON dbo.Carts (IDUser) 
    WHERE IsActive = 1 AND IDUser IS NOT NULL;

    -- Enforce unique active guest cart token
    CREATE UNIQUE NONCLUSTERED INDEX UQ_Carts_ActiveGuest 
    ON dbo.Carts (GuestToken) 
    WHERE IsActive = 1 AND GuestToken IS NOT NULL;

    CREATE NONCLUSTERED INDEX IX_Carts_LastActivityAt ON dbo.Carts (LastActivityAt);
END
GO

IF OBJECT_ID(N'dbo.CartItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItems (
        IDCartItem INT IDENTITY(1,1) NOT NULL,
        IDCart INT NOT NULL,
        IDVariant INT NOT NULL,
        Quantity INT NOT NULL,
        AddedAt DATETIME2(3) NOT NULL CONSTRAINT DF_CartItems_AddedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_CartItems PRIMARY KEY CLUSTERED (IDCartItem),
        CONSTRAINT UQ_CartItems_Cart_Variant UNIQUE (IDCart, IDVariant),
        CONSTRAINT FK_CartItems_Cart FOREIGN KEY (IDCart) REFERENCES dbo.Carts (IDCart) ON DELETE CASCADE,
        CONSTRAINT FK_CartItems_Variant FOREIGN KEY (IDVariant) REFERENCES dbo.ProductVariants (IDVariant),
        CONSTRAINT CK_CartItems_Quantity CHECK (Quantity > 0)
    );
END
GO

-- ============================================================================
-- 5. COUPONS AND COUPON USAGES (RF-05)
-- ============================================================================

IF OBJECT_ID(N'dbo.Coupons', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Coupons (
        IDCoupon INT IDENTITY(1,1) NOT NULL,
        Code VARCHAR(50) NOT NULL,
        DiscountType VARCHAR(20) NOT NULL,
        DiscountValue DECIMAL(12,2) NOT NULL,
        MinPurchaseAmount DECIMAL(12,2) NOT NULL CONSTRAINT DF_Coupons_MinPurchase DEFAULT 0.00,
        StartDate DATETIME2(3) NOT NULL,
        EndDate DATETIME2(3) NOT NULL,
        MaxTotalUses INT NOT NULL,
        CurrentUses INT NOT NULL CONSTRAINT DF_Coupons_CurrentUses DEFAULT 0,
        MaxUsesPerClient INT NOT NULL CONSTRAINT DF_Coupons_MaxUsesPerClient DEFAULT 1,
        IDCategory INT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Coupons_IsActive DEFAULT 1,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Coupons_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Coupons PRIMARY KEY CLUSTERED (IDCoupon),
        CONSTRAINT UQ_Coupons_Code UNIQUE (Code),
        CONSTRAINT FK_Coupons_Category FOREIGN KEY (IDCategory) REFERENCES dbo.Categories (IDCategory),
        CONSTRAINT CK_Coupons_DiscountType CHECK (DiscountType IN ('PERCENTAGE', 'FIXED_AMOUNT')),
        CONSTRAINT CK_Coupons_DiscountValue CHECK (DiscountValue > 0),
        CONSTRAINT CK_Coupons_MinPurchase CHECK (MinPurchaseAmount >= 0),
        CONSTRAINT CK_Coupons_Dates CHECK (EndDate > StartDate),
        CONSTRAINT CK_Coupons_Uses CHECK (MaxTotalUses >= CurrentUses AND CurrentUses >= 0),
        CONSTRAINT CK_Coupons_MaxUsesPerClient CHECK (MaxUsesPerClient > 0)
    );
END
GO

-- ============================================================================
-- 6. ORDERS, ORDER DETAILS, STATUS HISTORY, AND COUPON USAGES (RF-06, RF-07)
-- ============================================================================

IF OBJECT_ID(N'dbo.Orders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        IDOrder INT IDENTITY(1,1) NOT NULL,
        OrderNumber VARCHAR(30) NOT NULL,
        IDUser INT NOT NULL,
        IDCart INT NULL,
        IDDeliveryAddress INT NOT NULL,
        ShippingAddressSnapshot NVARCHAR(MAX) NOT NULL,
        NetSubtotal DECIMAL(12,2) NOT NULL,
        IVATaxAmount DECIMAL(12,2) NOT NULL,
        DiscountTotal DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_DiscountTotal DEFAULT 0.00,
        GrandTotal DECIMAL(12,2) NOT NULL,
        IDCoupon INT NULL,
        Status VARCHAR(30) NOT NULL,
        IdempotencyKey VARCHAR(100) NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NULL,
        CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (IDOrder),
        CONSTRAINT UQ_Orders_OrderNumber UNIQUE (OrderNumber),
        CONSTRAINT UQ_Orders_IdempotencyKey UNIQUE (IdempotencyKey),
        CONSTRAINT FK_Orders_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser),
        CONSTRAINT FK_Orders_Cart FOREIGN KEY (IDCart) REFERENCES dbo.Carts (IDCart),
        CONSTRAINT FK_Orders_Address FOREIGN KEY (IDDeliveryAddress) REFERENCES dbo.Addresses (IDAddress),
        CONSTRAINT FK_Orders_Coupon FOREIGN KEY (IDCoupon) REFERENCES dbo.Coupons (IDCoupon),
        CONSTRAINT CK_Orders_NetSubtotal CHECK (NetSubtotal >= 0),
        CONSTRAINT CK_Orders_IVATaxAmount CHECK (IVATaxAmount >= 0),
        CONSTRAINT CK_Orders_DiscountTotal CHECK (DiscountTotal >= 0),
        CONSTRAINT CK_Orders_GrandTotal CHECK (GrandTotal >= 0),
        CONSTRAINT CK_Orders_Status CHECK (Status IN (
            'PAYMENT_PENDING',
            'PAID',
            'IN_PREPARATION',
            'DISPATCHED',
            'DELIVERED',
            'CANCELLED',
            'PARTIALLY_RETURNED',
            'FULLY_RETURNED'
        ))
    );
    CREATE NONCLUSTERED INDEX IX_Orders_IDUser ON dbo.Orders (IDUser);
    CREATE NONCLUSTERED INDEX IX_Orders_Status_CreatedAt ON dbo.Orders (Status, CreatedAt);
END
GO

IF OBJECT_ID(N'dbo.CouponUsages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CouponUsages (
        IDCouponUsage INT IDENTITY(1,1) NOT NULL,
        IDCoupon INT NOT NULL,
        IDUser INT NOT NULL,
        IDOrder INT NOT NULL,
        DiscountApplied DECIMAL(12,2) NOT NULL,
        UsedAt DATETIME2(3) NOT NULL CONSTRAINT DF_CouponUsages_UsedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_CouponUsages PRIMARY KEY CLUSTERED (IDCouponUsage),
        CONSTRAINT UQ_CouponUsages_Order UNIQUE (IDOrder),
        CONSTRAINT FK_CouponUsages_Coupon FOREIGN KEY (IDCoupon) REFERENCES dbo.Coupons (IDCoupon),
        CONSTRAINT FK_CouponUsages_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser),
        CONSTRAINT FK_CouponUsages_Order FOREIGN KEY (IDOrder) REFERENCES dbo.Orders (IDOrder),
        CONSTRAINT CK_CouponUsages_Discount CHECK (DiscountApplied >= 0)
    );
    CREATE NONCLUSTERED INDEX IX_CouponUsages_Coupon_User ON dbo.CouponUsages (IDCoupon, IDUser);
END
GO

IF OBJECT_ID(N'dbo.OrderItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems (
        IDOrderItem INT IDENTITY(1,1) NOT NULL,
        IDOrder INT NOT NULL,
        IDVariant INT NOT NULL,
        HistoricalSKU VARCHAR(50) NOT NULL,
        HistoricalProductName NVARCHAR(150) NOT NULL,
        UnitPrice DECIMAL(12,2) NOT NULL,
        QuantitySold INT NOT NULL,
        QuantityReturned INT NOT NULL CONSTRAINT DF_OrderItems_QuantityReturned DEFAULT 0,
        LineTotal DECIMAL(12,2) NOT NULL,
        CONSTRAINT PK_OrderItems PRIMARY KEY CLUSTERED (IDOrderItem),
        CONSTRAINT FK_OrderItems_Order FOREIGN KEY (IDOrder) REFERENCES dbo.Orders (IDOrder) ON DELETE CASCADE,
        CONSTRAINT FK_OrderItems_Variant FOREIGN KEY (IDVariant) REFERENCES dbo.ProductVariants (IDVariant),
        CONSTRAINT CK_OrderItems_Price CHECK (UnitPrice >= 0),
        CONSTRAINT CK_OrderItems_QuantitySold CHECK (QuantitySold > 0),
        CONSTRAINT CK_OrderItems_QuantityReturned CHECK (QuantityReturned >= 0 AND QuantityReturned <= QuantitySold),
        CONSTRAINT CK_OrderItems_LineTotal CHECK (LineTotal >= 0)
    );
    CREATE NONCLUSTERED INDEX IX_OrderItems_IDOrder ON dbo.OrderItems (IDOrder);
END
GO

IF OBJECT_ID(N'dbo.OrderStatusHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderStatusHistory (
        IDOrderStatusHistory INT IDENTITY(1,1) NOT NULL,
        IDOrder INT NOT NULL,
        PreviousStatus VARCHAR(30) NULL,
        NewStatus VARCHAR(30) NOT NULL,
        IDUser INT NOT NULL,
        Reason NVARCHAR(255) NULL,
        ChangedAt DATETIME2(3) NOT NULL CONSTRAINT DF_OrderStatusHistory_ChangedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_OrderStatusHistory PRIMARY KEY CLUSTERED (IDOrderStatusHistory),
        CONSTRAINT FK_OrderStatusHistory_Order FOREIGN KEY (IDOrder) REFERENCES dbo.Orders (IDOrder) ON DELETE CASCADE,
        CONSTRAINT FK_OrderStatusHistory_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser)
    );
    CREATE NONCLUSTERED INDEX IX_OrderStatusHistory_IDOrder ON dbo.OrderStatusHistory (IDOrder);
END
GO

-- ============================================================================
-- 7. STOCK RESERVATIONS, KARDEX, AND RETURNS (RF-03, RF-06, RF-07)
-- ============================================================================

IF OBJECT_ID(N'dbo.StockReservations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StockReservations (
        IDReservation INT IDENTITY(1,1) NOT NULL,
        IDVariant INT NOT NULL,
        IDCart INT NOT NULL,
        Quantity INT NOT NULL,
        ReservedAt DATETIME2(3) NOT NULL CONSTRAINT DF_StockReservations_ReservedAt DEFAULT SYSUTCDATETIME(),
        ExpiresAt DATETIME2(3) NOT NULL,
        Status VARCHAR(20) NOT NULL CONSTRAINT DF_StockReservations_Status DEFAULT 'ACTIVE',
        IDOrder INT NULL,
        CONSTRAINT PK_StockReservations PRIMARY KEY CLUSTERED (IDReservation),
        CONSTRAINT FK_StockReservations_Variant FOREIGN KEY (IDVariant) REFERENCES dbo.ProductVariants (IDVariant),
        CONSTRAINT FK_StockReservations_Cart FOREIGN KEY (IDCart) REFERENCES dbo.Carts (IDCart),
        CONSTRAINT FK_StockReservations_Order FOREIGN KEY (IDOrder) REFERENCES dbo.Orders (IDOrder),
        CONSTRAINT CK_StockReservations_Quantity CHECK (Quantity > 0),
        CONSTRAINT CK_StockReservations_Status CHECK (Status IN ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'))
    );
    CREATE NONCLUSTERED INDEX IX_StockReservations_Variant_Status ON dbo.StockReservations (IDVariant, Status) INCLUDE (Quantity, ExpiresAt);
    CREATE NONCLUSTERED INDEX IX_StockReservations_ExpiresAt ON dbo.StockReservations (ExpiresAt) WHERE Status = 'ACTIVE';
END
GO

IF OBJECT_ID(N'dbo.Kardex', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Kardex (
        IDKardex INT IDENTITY(1,1) NOT NULL,
        IDVariant INT NOT NULL,
        MovementType VARCHAR(30) NOT NULL,
        Quantity INT NOT NULL,
        PreviousBalance INT NOT NULL,
        NewBalance INT NOT NULL,
        Reason NVARCHAR(255) NOT NULL,
        IDUser INT NOT NULL,
        IDOrder INT NULL,
        MovementDate DATETIME2(3) NOT NULL CONSTRAINT DF_Kardex_MovementDate DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Kardex PRIMARY KEY CLUSTERED (IDKardex),
        CONSTRAINT FK_Kardex_Variant FOREIGN KEY (IDVariant) REFERENCES dbo.ProductVariants (IDVariant),
        CONSTRAINT FK_Kardex_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser),
        CONSTRAINT FK_Kardex_Order FOREIGN KEY (IDOrder) REFERENCES dbo.Orders (IDOrder),
        CONSTRAINT CK_Kardex_MovementType CHECK (MovementType IN (
            'PURCHASE_ENTRY',
            'SALE_EXIT',
            'POSITIVE_ADJUSTMENT',
            'NEGATIVE_ADJUSTMENT',
            'CLIENT_RETURN'
        )),
        CONSTRAINT CK_Kardex_Balances CHECK (PreviousBalance >= 0 AND NewBalance >= 0)
    );
    CREATE NONCLUSTERED INDEX IX_Kardex_IDVariant ON dbo.Kardex (IDVariant, MovementDate);
END
GO

IF OBJECT_ID(N'dbo.Returns', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Returns (
        IDReturn INT IDENTITY(1,1) NOT NULL,
        IDOrder INT NOT NULL,
        IDOperatorUser INT NOT NULL,
        Reason NVARCHAR(255) NOT NULL,
        TotalRefundAmount DECIMAL(12,2) NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Returns_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Returns PRIMARY KEY CLUSTERED (IDReturn),
        CONSTRAINT FK_Returns_Order FOREIGN KEY (IDOrder) REFERENCES dbo.Orders (IDOrder),
        CONSTRAINT FK_Returns_Operator FOREIGN KEY (IDOperatorUser) REFERENCES dbo.Users (IDUser),
        CONSTRAINT CK_Returns_TotalRefund CHECK (TotalRefundAmount >= 0)
    );
    CREATE NONCLUSTERED INDEX IX_Returns_IDOrder ON dbo.Returns (IDOrder);
END
GO

IF OBJECT_ID(N'dbo.ReturnItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ReturnItems (
        IDReturnItem INT IDENTITY(1,1) NOT NULL,
        IDReturn INT NOT NULL,
        IDOrderItem INT NOT NULL,
        QuantityReturned INT NOT NULL,
        RefundedAmount DECIMAL(12,2) NOT NULL,
        CONSTRAINT PK_ReturnItems PRIMARY KEY CLUSTERED (IDReturnItem),
        CONSTRAINT FK_ReturnItems_Return FOREIGN KEY (IDReturn) REFERENCES dbo.Returns (IDReturn) ON DELETE CASCADE,
        CONSTRAINT FK_ReturnItems_OrderItem FOREIGN KEY (IDOrderItem) REFERENCES dbo.OrderItems (IDOrderItem),
        CONSTRAINT CK_ReturnItems_Quantity CHECK (QuantityReturned > 0),
        CONSTRAINT CK_ReturnItems_RefundedAmount CHECK (RefundedAmount >= 0)
    );
END
GO

-- ============================================================================
-- 8. AUDIT LOG (RF-09: IMMUTABLE AUDIT TRAIL)
-- ============================================================================

IF OBJECT_ID(N'dbo.AuditLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLog (
        IDAuditLog INT IDENTITY(1,1) NOT NULL,
        IDUser INT NULL,
        Module VARCHAR(50) NOT NULL,
        EntityName VARCHAR(50) NOT NULL,
        EntityID VARCHAR(50) NOT NULL,
        ActionType VARCHAR(30) NOT NULL,
        PreviousValueJson NVARCHAR(MAX) NULL,
        NewValueJson NVARCHAR(MAX) NULL,
        LoggedAt DATETIME2(3) NOT NULL CONSTRAINT DF_AuditLog_LoggedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AuditLog PRIMARY KEY CLUSTERED (IDAuditLog),
        CONSTRAINT FK_AuditLog_User FOREIGN KEY (IDUser) REFERENCES dbo.Users (IDUser),
        CONSTRAINT CK_AuditLog_ActionType CHECK (ActionType IN ('CREATE', 'UPDATE', 'DEACTIVATE'))
    );
    CREATE NONCLUSTERED INDEX IX_AuditLog_Module_LoggedAt ON dbo.AuditLog (Module, LoggedAt);
    CREATE NONCLUSTERED INDEX IX_AuditLog_Entity ON dbo.AuditLog (EntityName, EntityID);
END
GO

-- Prevent any modification or deletion on AuditLog table
IF NOT EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'TR_AuditLog_PreventModification')
BEGIN
    EXEC(N'
    CREATE TRIGGER TR_AuditLog_PreventModification
    ON dbo.AuditLog
    FOR UPDATE, DELETE
    AS
    BEGIN
        SET NOCOUNT ON;
        RAISERROR(''The AuditLog table is strictly immutable. UPDATE and DELETE statements are prohibited.'', 16, 1);
        ROLLBACK TRANSACTION;
    END');
END
GO
