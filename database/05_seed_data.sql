-- ============================================================================
-- Script 05: Seed Data (Initial Configurations, Lookup Values & Demo Data)
-- Project: ShopCart (Tech Challenge 360 - Grupo Pentandra)
-- DBMS: Microsoft SQL Server 2019+
-- Test Credentials Password for all users: 'Admin123!' / 'Client123!' (Pre-hashed)
-- ============================================================================

USE ShopCartDB;
GO

-- ============================================================================
-- 1. VALUES LOOKUP CATALOG
-- ============================================================================

MERGE INTO dbo.ValuesLookup AS Target
USING (VALUES
    -- User Roles
    ('USER_ROLE', 'ADMINISTRATOR', 'Administrator', 'Full system access', 1),
    ('USER_ROLE', 'OPERATOR', 'Operator', 'Orders preparation, dispatch, and inventory adjustments', 2),
    ('USER_ROLE', 'CLIENT', 'Client', 'Store browsing, cart, checkout, order tracking', 3),

    -- Order Statuses
    ('ORDER_STATUS', 'PAYMENT_PENDING', 'Payment Pending', 'Awaiting payment confirmation', 1),
    ('ORDER_STATUS', 'PAID', 'Paid', 'Payment processed and stock secured', 2),
    ('ORDER_STATUS', 'IN_PREPARATION', 'In Preparation', 'Warehouse packaging and preparation', 3),
    ('ORDER_STATUS', 'DISPATCHED', 'Dispatched', 'Shipped with courier company', 4),
    ('ORDER_STATUS', 'DELIVERED', 'Delivered', 'Order received by client', 5),
    ('ORDER_STATUS', 'CANCELLED', 'Cancelled', 'Cancelled before dispatch, inventory returned', 6),
    ('ORDER_STATUS', 'PARTIALLY_RETURNED', 'Partially Returned', 'One or more items refunded', 7),
    ('ORDER_STATUS', 'FULLY_RETURNED', 'Fully Returned', 'All items refunded', 8),

    -- Kardex Movement Types
    ('KARDEX_MOVEMENT_TYPE', 'PURCHASE_ENTRY', 'Purchase Entry', 'Inbound inventory stock receipt', 1),
    ('KARDEX_MOVEMENT_TYPE', 'SALE_EXIT', 'Sale Exit', 'Stock deducted on order payment', 2),
    ('KARDEX_MOVEMENT_TYPE', 'POSITIVE_ADJUSTMENT', 'Positive Adjustment', 'Manual count increase or order cancellation restock', 3),
    ('KARDEX_MOVEMENT_TYPE', 'NEGATIVE_ADJUSTMENT', 'Negative Adjustment', 'Manual count reduction, damage or shrinkage', 4),
    ('KARDEX_MOVEMENT_TYPE', 'CLIENT_RETURN', 'Client Return', 'Stock re-entry from approved return', 5),

    -- Stock Reservation Statuses
    ('RESERVATION_STATUS', 'ACTIVE', 'Active', '15-minute checkout hold active', 1),
    ('RESERVATION_STATUS', 'COMPLETED', 'Completed', 'Converted to order sale', 2),
    ('RESERVATION_STATUS', 'EXPIRED', 'Expired', 'Reservation timed out (>15 min)', 3),
    ('RESERVATION_STATUS', 'CANCELLED', 'Cancelled', 'Cancelled by customer', 4),

    -- Coupon Discount Types
    ('COUPON_DISCOUNT_TYPE', 'PERCENTAGE', 'Percentage', 'Relative percentage discount', 1),
    ('COUPON_DISCOUNT_TYPE', 'FIXED_AMOUNT', 'Fixed Amount', 'Absolute Quetzales discount', 2),

    -- Audit Action Types
    ('AUDIT_ACTION', 'CREATE', 'Create', 'Entity creation', 1),
    ('AUDIT_ACTION', 'UPDATE', 'Update', 'Entity attribute modification', 2),
    ('AUDIT_ACTION', 'DEACTIVATE', 'Deactivate', 'Soft delete entity', 3)
) AS Source (ValueCategory, Code, Name, Description, DisplayOrder)
ON (Target.ValueCategory = Source.ValueCategory AND Target.Code = Source.Code)
WHEN MATCHED THEN
    UPDATE SET Target.Name = Source.Name, Target.Description = Source.Description, Target.DisplayOrder = Source.DisplayOrder
WHEN NOT MATCHED THEN
    INSERT (ValueCategory, Code, Name, Description, DisplayOrder, IsActive)
    VALUES (Source.ValueCategory, Source.Code, Source.Name, Source.Description, Source.DisplayOrder, 1);
GO

-- ============================================================================
-- 2. SYSTEM CONFIGURATIONS
-- ============================================================================

MERGE INTO dbo.Configurations AS Target
USING (VALUES
    ('SISTEMA_IVA_PORCENTAJE', '0.12', 'DECIMAL', 'Value Added Tax (IVA) rate (12% included in sales price)', 1),
    ('SISTEMA_MONEDA_ISO', 'GTQ', 'TEXT', 'Official currency ISO code (Guatemalan Quetzales)', 0),
    ('INVENTARIO_RESERVA_MINUTOS', '15', 'INTEGER', 'Checkout stock reservation timeout in minutes', 1),
    ('CARRITO_ABANDONADO_HORAS', '24', 'INTEGER', 'Inactivity threshold in hours to classify a cart as abandoned', 1),
    ('AUTH_ACCESS_TOKEN_MINUTOS', '15', 'INTEGER', 'JWT access token lifespan in minutes', 1),
    ('AUTH_REFRESH_TOKEN_DIAS', '7', 'INTEGER', 'Rotating refresh token lifespan in days', 1)
) AS Source (ConfigKey, ConfigValue, DataType, Description, IsEditable)
ON (Target.ConfigKey = Source.ConfigKey)
WHEN MATCHED THEN
    UPDATE SET Target.DataType = Source.DataType, Target.Description = Source.Description, Target.IsEditable = Source.IsEditable
WHEN NOT MATCHED THEN
    INSERT (ConfigKey, ConfigValue, DataType, Description, IsEditable, UpdatedAt)
    VALUES (Source.ConfigKey, Source.ConfigValue, Source.DataType, Source.Description, Source.IsEditable, SYSUTCDATETIME());
GO

-- ============================================================================
-- 3. TEST USERS (Admin, Operator, Clients)
-- Default Password for all: 'Password123!'
-- Bcrypt Hash: $2a$12$L7pYjZcMv6QYpU2d6B4pueeS8aU07a6s57L1jU21e9bW3aX4dY76q
-- ============================================================================

DECLARE @AdminRoleID INT = (SELECT IDValue FROM dbo.ValuesLookup WHERE ValueCategory = 'USER_ROLE' AND Code = 'ADMINISTRATOR');
DECLARE @OperatorRoleID INT = (SELECT IDValue FROM dbo.ValuesLookup WHERE ValueCategory = 'USER_ROLE' AND Code = 'OPERATOR');
DECLARE @ClientRoleID INT = (SELECT IDValue FROM dbo.ValuesLookup WHERE ValueCategory = 'USER_ROLE' AND Code = 'CLIENT');

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'admin@shopcart.gt')
BEGIN
    INSERT INTO dbo.Users (IDRole, FullName, Email, PasswordHash, PhoneNumber, IsActive, CreatedAt)
    VALUES (@AdminRoleID, 'Admin Pentandra', 'admin@shopcart.gt', '$2a$12$L7pYjZcMv6QYpU2d6B4pueeS8aU07a6s57L1jU21e9bW3aX4dY76q', '+502 2222-0001', 1, SYSUTCDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'operator@shopcart.gt')
BEGIN
    INSERT INTO dbo.Users (IDRole, FullName, Email, PasswordHash, PhoneNumber, IsActive, CreatedAt)
    VALUES (@OperatorRoleID, 'Carlos Bodega Operador', 'operator@shopcart.gt', '$2a$12$L7pYjZcMv6QYpU2d6B4pueeS8aU07a6s57L1jU21e9bW3aX4dY76q', '+502 2222-0002', 1, SYSUTCDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = 'cliente@shopcart.gt')
BEGIN
    INSERT INTO dbo.Users (IDRole, FullName, Email, PasswordHash, PhoneNumber, IsActive, CreatedAt)
    VALUES (@ClientRoleID, 'Maria Lopez Cliente', 'cliente@shopcart.gt', '$2a$12$L7pYjZcMv6QYpU2d6B4pueeS8aU07a6s57L1jU21e9bW3aX4dY76q', '+502 5555-1234', 1, SYSUTCDATETIME());

    DECLARE @NewClientID INT = SCOPE_IDENTITY();
    INSERT INTO dbo.Addresses (IDUser, Alias, RecipientName, AddressLine1, AddressLine2, Municipality, Department, PostalCode, ContactPhone, IsActive)
    VALUES (@NewClientID, 'Casa', 'Maria Lopez', '12 Calle 5-43 Zona 10', 'Edificio Reforma 10, Nivel 4', 'Guatemala', 'Guatemala', '01010', '+502 5555-1234', 1);
END
GO

-- ============================================================================
-- 4. CATEGORIES, PRODUCTS & VARIANTS
-- ============================================================================

DECLARE @AdminUserID INT = (SELECT IDUser FROM dbo.Users WHERE Email = 'admin@shopcart.gt');

-- Categories
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = 'Tecnología')
BEGIN
    INSERT INTO dbo.Categories (Name, Description, IsActive, CreatedAt)
    VALUES ('Tecnología', 'Dispositivos electrónicos, computadoras y accesorios', 1, SYSUTCDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = 'Ropa y Calzado')
BEGIN
    INSERT INTO dbo.Categories (Name, Description, IsActive, CreatedAt)
    VALUES ('Ropa y Calzado', 'Prendas de vestir, calzado y complementos de moda', 1, SYSUTCDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = 'Hogar y Oficina')
BEGIN
    INSERT INTO dbo.Categories (Name, Description, IsActive, CreatedAt)
    VALUES ('Hogar y Oficina', 'Mobiliario, electrodomésticos y decoración', 1, SYSUTCDATETIME());
END
GO

-- Products and Variants
DECLARE @AdminUserID INT = (SELECT IDUser FROM dbo.Users WHERE Email = 'admin@shopcart.gt');
DECLARE @CatTech INT = (SELECT IDCategory FROM dbo.Categories WHERE Name = 'Tecnología');
DECLARE @CatRopa INT = (SELECT IDCategory FROM dbo.Categories WHERE Name = 'Ropa y Calzado');

-- Product 1: Smartphone Pro
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = 'Smartphone Pentandra X Pro')
BEGIN
    DECLARE @P1 INT;
    INSERT INTO dbo.Products (IDCategory, Name, Description, MainImageUrl, IsActive, CreatedAt)
    VALUES (@CatTech, 'Smartphone Pentandra X Pro', 'Teléfono inteligente de alta gama con pantalla OLED 120Hz, 5G y triple cámara de 108MP.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600', 1, SYSUTCDATETIME());
    SET @P1 = SCOPE_IDENTITY();

    -- Variant 1: 128GB Black (Q 3,500.00, stock 15)
    DECLARE @V1 INT;
    INSERT INTO dbo.ProductVariants (IDProduct, SKU, AttributesJson, Price, PhysicalStock, IsActive, CreatedAt)
    VALUES (@P1, 'TECH-PHN-128-BLK', '{"storage": "128GB", "color": "Negro Espacial"}', 3500.00, 15, 1, SYSUTCDATETIME());
    SET @V1 = SCOPE_IDENTITY();

    INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, MovementDate)
    VALUES (@V1, 'PURCHASE_ENTRY', 15, 0, 15, 'Initial seed stock', @AdminUserID, SYSUTCDATETIME());

    -- Variant 2: 256GB Silver (Q 4,200.00, stock 10)
    DECLARE @V2 INT;
    INSERT INTO dbo.ProductVariants (IDProduct, SKU, AttributesJson, Price, PhysicalStock, IsActive, CreatedAt)
    VALUES (@P1, 'TECH-PHN-256-SLV', '{"storage": "256GB", "color": "Plata Lunar"}', 4200.00, 10, 1, SYSUTCDATETIME());
    SET @V2 = SCOPE_IDENTITY();

    INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, MovementDate)
    VALUES (@V2, 'PURCHASE_ENTRY', 10, 0, 10, 'Initial seed stock', @AdminUserID, SYSUTCDATETIME());
END

-- Product 2: Camiseta Polo Classic
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = 'Camiseta Polo Premium')
BEGIN
    DECLARE @P2 INT;
    INSERT INTO dbo.Products (IDCategory, Name, Description, MainImageUrl, IsActive, CreatedAt)
    VALUES (@CatRopa, 'Camiseta Polo Premium', 'Camiseta polo de corte regular 100% algodón peinado con bordado exclusivo.', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600', 1, SYSUTCDATETIME());
    SET @P2 = SCOPE_IDENTITY();

    -- Variant S Navy (Q 180.00, stock 25)
    DECLARE @V3 INT;
    INSERT INTO dbo.ProductVariants (IDProduct, SKU, AttributesJson, Price, PhysicalStock, IsActive, CreatedAt)
    VALUES (@P2, 'CLOTH-POLO-S-NVY', '{"size": "S", "color": "Azul Marino"}', 180.00, 25, 1, SYSUTCDATETIME());
    SET @V3 = SCOPE_IDENTITY();

    INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, MovementDate)
    VALUES (@V3, 'PURCHASE_ENTRY', 25, 0, 25, 'Initial seed stock', @AdminUserID, SYSUTCDATETIME());

    -- Variant M Navy (Q 180.00, stock 30)
    DECLARE @V4 INT;
    INSERT INTO dbo.ProductVariants (IDProduct, SKU, AttributesJson, Price, PhysicalStock, IsActive, CreatedAt)
    VALUES (@P2, 'CLOTH-POLO-M-NVY', '{"size": "M", "color": "Azul Marino"}', 180.00, 30, 1, SYSUTCDATETIME());
    SET @V4 = SCOPE_IDENTITY();

    INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, MovementDate)
    VALUES (@V4, 'PURCHASE_ENTRY', 30, 0, 30, 'Initial seed stock', @AdminUserID, SYSUTCDATETIME());

    -- Variant L White (Q 180.00, stock 20)
    DECLARE @V5 INT;
    INSERT INTO dbo.ProductVariants (IDProduct, SKU, AttributesJson, Price, PhysicalStock, IsActive, CreatedAt)
    VALUES (@P2, 'CLOTH-POLO-L-WHT', '{"size": "L", "color": "Blanco"}', 180.00, 20, 1, SYSUTCDATETIME());
    SET @V5 = SCOPE_IDENTITY();

    INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, MovementDate)
    VALUES (@V5, 'PURCHASE_ENTRY', 20, 0, 20, 'Initial seed stock', @AdminUserID, SYSUTCDATETIME());
END
GO

-- ============================================================================
-- 5. PROMOTIONAL COUPONS (RF-05)
-- ============================================================================

-- Coupon 1: BIENVENIDA10 (10% discount, min purchase Q 200.00, max 100 uses, 1 per client)
IF NOT EXISTS (SELECT 1 FROM dbo.Coupons WHERE Code = 'BIENVENIDA10')
BEGIN
    INSERT INTO dbo.Coupons (
        Code, DiscountType, DiscountValue, MinPurchaseAmount, 
        StartDate, EndDate, MaxTotalUses, CurrentUses, 
        MaxUsesPerClient, IDCategory, IsActive, CreatedAt
    )
    VALUES (
        'BIENVENIDA10', 'PERCENTAGE', 10.00, 200.00,
        SYSUTCDATETIME(), DATEADD(MONTH, 6, SYSUTCDATETIME()), 100, 0,
        1, NULL, 1, SYSUTCDATETIME()
    );
END

-- Coupon 2: PENTANDRA50 (Fixed Q 50.00 discount, min purchase Q 300.00, max 50 uses, 2 per client)
IF NOT EXISTS (SELECT 1 FROM dbo.Coupons WHERE Code = 'PENTANDRA50')
BEGIN
    INSERT INTO dbo.Coupons (
        Code, DiscountType, DiscountValue, MinPurchaseAmount, 
        StartDate, EndDate, MaxTotalUses, CurrentUses, 
        MaxUsesPerClient, IDCategory, IsActive, CreatedAt
    )
    VALUES (
        'PENTANDRA50', 'FIXED_AMOUNT', 50.00, 300.00,
        SYSUTCDATETIME(), DATEADD(MONTH, 3, SYSUTCDATETIME()), 50, 0,
        2, NULL, 1, SYSUTCDATETIME()
    );
END
GO
