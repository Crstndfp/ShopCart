-- ============================================================================
-- Script 04: Stored Procedures (SP_Module_Process)
-- Project: ShopCart (Tech Challenge 360 - Grupo Pentandra)
-- DBMS: Microsoft SQL Server 2019+
-- Standards: SP_Module_Process, Typed Parameters, Strict ACID, UPDLOCK Concurrency
-- ============================================================================

USE ShopCartDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. AUTHENTICATION & USERS MODULE (RF-01)
-- ============================================================================

-- ============================================================================
-- Procedure: dbo.SP_Auth_RegisterUser
-- Module: RF-01 (Authentication & Users)
-- Description: Registers a new user with role resolution and audit logging.
-- Parameters:
--   @RoleCode VARCHAR(50): Role code ('CLIENT', 'ADMINISTRATOR', etc.)
--   @FullName NVARCHAR(150): Full name of the user
--   @Email VARCHAR(150): Unique email address
--   @PasswordHash VARCHAR(255): Argon2id password hash
--   @PhoneNumber VARCHAR(30) NULL: Optional contact phone
--   @NewIDUser INT OUTPUT: Generated User ID
-- Throws:
--   INVALID_ROLE (16, 1)
--   EMAIL_ALREADY_EXISTS (16, 1)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.SP_Auth_RegisterUser
    @RoleCode VARCHAR(50),
    @FullName NVARCHAR(150),
    @Email VARCHAR(150),
    @PasswordHash VARCHAR(255),
    @PhoneNumber VARCHAR(30) = NULL,
    @NewIDUser INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IDRole INT;
    SELECT @IDRole = IDValue FROM dbo.ValuesLookup WHERE ValueCategory = 'USER_ROLE' AND Code = @RoleCode AND IsActive = 1;

    IF @IDRole IS NULL
    BEGIN
        RAISERROR('INVALID_ROLE: The specified user role does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
    BEGIN
        RAISERROR('EMAIL_ALREADY_EXISTS: A user with this email address is already registered.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        INSERT INTO dbo.Users (IDRole, FullName, Email, PasswordHash, PhoneNumber, IsActive, CreatedAt)
        VALUES (@IDRole, @FullName, @Email, @PasswordHash, @PhoneNumber, 1, SYSUTCDATETIME());

        SET @NewIDUser = SCOPE_IDENTITY();

        -- Audit Log entry
        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@NewIDUser, 'AUTH', 'Users', CAST(@NewIDUser AS VARCHAR(50)), 'CREATE', 
                (SELECT @FullName AS FullName, @Email AS Email, @RoleCode AS RoleCode FOR JSON PATH, WITHOUT_ARRAY_WRAPPER), 
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Auth_GetUserByEmail
    @Email VARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        U.IDUser,
        U.IDRole,
        VL.Code AS RoleCode,
        VL.Name AS RoleName,
        U.FullName,
        U.Email,
        U.PasswordHash,
        U.PhoneNumber,
        U.IsActive,
        U.CreatedAt,
        U.UpdatedAt
    FROM dbo.Users U
    JOIN dbo.ValuesLookup VL ON U.IDRole = VL.IDValue
    WHERE U.Email = @Email;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Auth_GetUserByID
    @IDUser INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        U.IDUser,
        U.IDRole,
        VL.Code AS RoleCode,
        VL.Name AS RoleName,
        U.FullName,
        U.Email,
        U.PhoneNumber,
        U.IsActive,
        U.CreatedAt,
        U.UpdatedAt
    FROM dbo.Users U
    JOIN dbo.ValuesLookup VL ON U.IDRole = VL.IDValue
    WHERE U.IDUser = @IDUser;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Auth_SaveRefreshToken
    @IDUser INT,
    @TokenHash VARCHAR(128),
    @ExpiresAt DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.RefreshTokens (IDUser, TokenHash, ExpiresAt, IsRevoked, CreatedAt)
    VALUES (@IDUser, @TokenHash, @ExpiresAt, 0, SYSUTCDATETIME());
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Auth_RotateRefreshToken
    @OldTokenHash VARCHAR(128),
    @NewTokenHash VARCHAR(128),
    @NewExpiresAt DATETIME2(3),
    @UserID INT OUTPUT,
    @RoleCode VARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
        DECLARE @IDRefreshToken INT;
        DECLARE @IsRevoked BIT;
        DECLARE @ExpiresAt DATETIME2(3);

        SELECT 
            @IDRefreshToken = RT.IDRefreshToken,
            @UserID = RT.IDUser,
            @IsRevoked = RT.IsRevoked,
            @ExpiresAt = RT.ExpiresAt,
            @RoleCode = VL.Code
        FROM dbo.RefreshTokens RT
        JOIN dbo.Users U ON RT.IDUser = U.IDUser
        JOIN dbo.ValuesLookup VL ON U.IDRole = VL.IDValue
        WHERE RT.TokenHash = @OldTokenHash;

        IF @IDRefreshToken IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('TOKEN_NOT_FOUND: Refresh token not recognized.', 16, 1);
            RETURN;
        END

        IF @IsRevoked = 1 OR @ExpiresAt < SYSUTCDATETIME()
        BEGIN
            -- Security breach / token reuse detected: revoke entire token family for this user
            UPDATE dbo.RefreshTokens SET IsRevoked = 1 WHERE IDUser = @UserID;
            ROLLBACK TRANSACTION;
            RAISERROR('TOKEN_REUSE_DETECTED: Stale or revoked token reuse attempt. Session terminated.', 16, 1);
            RETURN;
        END

        -- Revoke old token and mark replacement
        UPDATE dbo.RefreshTokens
        SET IsRevoked = 1, ReplacedByTokenHash = @NewTokenHash
        WHERE IDRefreshToken = @IDRefreshToken;

        -- Insert new token in rotation
        INSERT INTO dbo.RefreshTokens (IDUser, TokenHash, ExpiresAt, IsRevoked, CreatedAt)
        VALUES (@UserID, @NewTokenHash, @NewExpiresAt, 0, SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Auth_RevokeRefreshToken
    @TokenHash VARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.RefreshTokens 
    SET IsRevoked = 1 
    WHERE TokenHash = @TokenHash;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Addresses_Create
    @IDUser INT,
    @Alias NVARCHAR(50),
    @RecipientName NVARCHAR(150),
    @AddressLine1 NVARCHAR(200),
    @AddressLine2 NVARCHAR(200) = NULL,
    @Municipality NVARCHAR(100),
    @Department NVARCHAR(100),
    @PostalCode VARCHAR(20) = NULL,
    @ContactPhone VARCHAR(30),
    @NewIDAddress INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Addresses (IDUser, Alias, RecipientName, AddressLine1, AddressLine2, Municipality, Department, PostalCode, ContactPhone, IsActive)
    VALUES (@IDUser, @Alias, @RecipientName, @AddressLine1, @AddressLine2, @Municipality, @Department, @PostalCode, @ContactPhone, 1);

    SET @NewIDAddress = SCOPE_IDENTITY();
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Addresses_ListByUser
    @IDUser INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IDAddress, IDUser, Alias, RecipientName, AddressLine1, AddressLine2, Municipality, Department, PostalCode, ContactPhone, IsActive
    FROM dbo.Addresses
    WHERE IDUser = @IDUser AND IsActive = 1
    ORDER BY IDAddress DESC;
END
GO

-- ============================================================================
-- 2. CATALOG & PRODUCTS MODULE (RF-02)
-- ============================================================================

CREATE OR ALTER PROCEDURE dbo.SP_Categories_Create
    @IDParentCategory INT = NULL,
    @Name NVARCHAR(100),
    @Description NVARCHAR(255) = NULL,
    @UserID INT,
    @NewIDCategory INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = @Name)
    BEGIN
        RAISERROR('CATEGORY_EXISTS: Category name already exists.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        INSERT INTO dbo.Categories (IDParentCategory, Name, Description, IsActive, CreatedAt)
        VALUES (@IDParentCategory, @Name, @Description, 1, SYSUTCDATETIME());

        SET @NewIDCategory = SCOPE_IDENTITY();

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'CATALOG', 'Categories', CAST(@NewIDCategory AS VARCHAR(50)), 'CREATE',
                (SELECT @Name AS Name, @Description AS Description FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Categories_List
    @OnlyActive BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    SELECT C.IDCategory, C.IDParentCategory, C.Name, C.Description, C.IsActive, C.CreatedAt,
           (SELECT COUNT(1) FROM dbo.Products P WHERE P.IDCategory = C.IDCategory AND P.IsActive = 1) AS ActiveProductsCount
    FROM dbo.Categories C
    WHERE (@OnlyActive = 0 OR C.IsActive = 1)
    ORDER BY C.Name ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Categories_Update
    @IDCategory INT,
    @IDParentCategory INT = NULL,
    @Name NVARCHAR(100),
    @Description NVARCHAR(255) = NULL,
    @IsActive BIT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE IDCategory = @IDCategory)
    BEGIN
        RAISERROR('CATEGORY_NOT_FOUND: Category does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = @Name AND IDCategory <> @IDCategory)
    BEGIN
        RAISERROR('CATEGORY_EXISTS: Another category with this name already exists.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.Categories
        SET IDParentCategory = @IDParentCategory,
            Name = @Name,
            Description = @Description,
            IsActive = @IsActive
        WHERE IDCategory = @IDCategory;

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'CATALOG', 'Categories', CAST(@IDCategory AS VARCHAR(50)), 'UPDATE',
                (SELECT @Name AS Name, @IsActive AS IsActive FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Products_Create
    @IDCategory INT,
    @Name NVARCHAR(150),
    @Description NVARCHAR(MAX) = NULL,
    @MainImageUrl NVARCHAR(500) = NULL,
    @UserID INT,
    @NewIDProduct INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE IDCategory = @IDCategory AND IsActive = 1)
    BEGIN
        RAISERROR('INVALID_CATEGORY: The specified category does not exist or is inactive.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        INSERT INTO dbo.Products (IDCategory, Name, Description, MainImageUrl, IsActive, CreatedAt)
        VALUES (@IDCategory, @Name, @Description, @MainImageUrl, 1, SYSUTCDATETIME());

        SET @NewIDProduct = SCOPE_IDENTITY();

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'CATALOG', 'Products', CAST(@NewIDProduct AS VARCHAR(50)), 'CREATE',
                (SELECT @IDCategory AS IDCategory, @Name AS Name FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Variants_Create
    @IDProduct INT,
    @SKU VARCHAR(50),
    @AttributesJson NVARCHAR(500),
    @Price DECIMAL(12,2),
    @InitialStock INT,
    @UserID INT,
    @NewIDVariant INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (SELECT 1 FROM dbo.ProductVariants WHERE SKU = @SKU)
    BEGIN
        RAISERROR('SKU_ALREADY_EXISTS: The specified SKU is already registered.', 16, 1);
        RETURN;
    END

    IF @Price < 0 OR @InitialStock < 0
    BEGIN
        RAISERROR('INVALID_VALUES: Price and initial stock cannot be negative.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        INSERT INTO dbo.ProductVariants (IDProduct, SKU, AttributesJson, Price, PhysicalStock, IsActive, CreatedAt)
        VALUES (@IDProduct, @SKU, @AttributesJson, @Price, @InitialStock, 1, SYSUTCDATETIME());

        SET @NewIDVariant = SCOPE_IDENTITY();

        -- Initial Kardex entry if stock > 0
        IF @InitialStock > 0
        BEGIN
            INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, MovementDate)
            VALUES (@NewIDVariant, 'PURCHASE_ENTRY', @InitialStock, 0, @InitialStock, 'Initial inventory stock on variant creation', @UserID, SYSUTCDATETIME());
        END

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'CATALOG', 'ProductVariants', CAST(@NewIDVariant AS VARCHAR(50)), 'CREATE',
                (SELECT @IDProduct AS IDProduct, @SKU AS SKU, @Price AS Price, @InitialStock AS InitialStock FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Products_Deactivate
    @IDProduct INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- RF-02 Acceptance Criteria: Products with associated sales cannot be physically deleted; they must be deactivated.
    DECLARE @SalesCount INT;
    SELECT @SalesCount = COUNT(1)
    FROM dbo.OrderItems OI
    JOIN dbo.ProductVariants PV ON OI.IDVariant = PV.IDVariant
    WHERE PV.IDProduct = @IDProduct;

    BEGIN TRANSACTION;
        UPDATE dbo.Products 
        SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
        WHERE IDProduct = @IDProduct;

        UPDATE dbo.ProductVariants
        SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
        WHERE IDProduct = @IDProduct;

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'CATALOG', 'Products', CAST(@IDProduct AS VARCHAR(50)), 'DEACTIVATE',
                (SELECT @IDProduct AS IDProduct, @SalesCount AS HistoricalSalesCount FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Products_Update
    @IDProduct INT,
    @IDCategory INT,
    @Name NVARCHAR(150),
    @Description NVARCHAR(MAX) = NULL,
    @MainImageUrl NVARCHAR(500) = NULL,
    @IsActive BIT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE IDProduct = @IDProduct)
    BEGIN
        RAISERROR('PRODUCT_NOT_FOUND: Product does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE IDCategory = @IDCategory AND IsActive = 1)
    BEGIN
        RAISERROR('INVALID_CATEGORY: Specified category does not exist or is inactive.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.Products
        SET IDCategory = @IDCategory,
            Name = @Name,
            Description = @Description,
            MainImageUrl = @MainImageUrl,
            IsActive = @IsActive,
            UpdatedAt = SYSUTCDATETIME()
        WHERE IDProduct = @IDProduct;

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'CATALOG', 'Products', CAST(@IDProduct AS VARCHAR(50)), 'UPDATE',
                (SELECT @IDProduct AS IDProduct, @Name AS Name, @IsActive AS IsActive FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Products_GetByID
    @IDProduct INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Product Header
    SELECT 
        P.IDProduct,
        P.IDCategory,
        C.Name AS CategoryName,
        P.Name AS ProductName,
        P.Description,
        P.MainImageUrl,
        P.IsActive,
        P.CreatedAt,
        P.UpdatedAt
    FROM dbo.Products P
    JOIN dbo.Categories C ON P.IDCategory = C.IDCategory
    WHERE P.IDProduct = @IDProduct;

    -- Product Variants with Available Stock
    SELECT 
        PV.IDVariant,
        PV.IDProduct,
        PV.SKU,
        PV.AttributesJson,
        PV.Price,
        PV.PhysicalStock,
        FAS.ReservedQuantity,
        FAS.AvailableStock,
        PV.IsActive,
        PV.CreatedAt
    FROM dbo.ProductVariants PV
    CROSS APPLY dbo.FU_Catalog_AvailableStock(PV.IDVariant) FAS
    WHERE PV.IDProduct = @IDProduct
    ORDER BY PV.IDVariant ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Variants_Update
    @IDVariant INT,
    @AttributesJson NVARCHAR(500),
    @Price DECIMAL(12,2),
    @IsActive BIT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Price < 0
    BEGIN
        RAISERROR('INVALID_PRICE: Price cannot be negative.', 16, 1);
        RETURN;
    END

    DECLARE @OldPrice DECIMAL(12,2);
    SELECT @OldPrice = Price FROM dbo.ProductVariants WHERE IDVariant = @IDVariant;

    IF @OldPrice IS NULL
    BEGIN
        RAISERROR('VARIANT_NOT_FOUND: Product variant does not exist.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.ProductVariants
        SET AttributesJson = @AttributesJson,
            Price = @Price,
            IsActive = @IsActive,
            UpdatedAt = SYSUTCDATETIME()
        WHERE IDVariant = @IDVariant;

        -- Record in audit log (especially price changes - RF-09)
        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, PreviousValueJson, NewValueJson, LoggedAt)
        VALUES (@UserID, 'CATALOG', 'ProductVariants', CAST(@IDVariant AS VARCHAR(50)), 'UPDATE',
                (SELECT @OldPrice AS Price FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                (SELECT @Price AS Price, @IsActive AS IsActive FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Catalog_SearchProducts
    @SearchText NVARCHAR(100) = NULL,
    @IDCategory INT = NULL,
    @MinPrice DECIMAL(12,2) = NULL,
    @MaxPrice DECIMAL(12,2) = NULL,
    @OnlyInStock BIT = 0,
    @SortBy VARCHAR(30) = 'NAME', -- 'NAME', 'PRICE', 'NEWEST'
    @SortDir VARCHAR(10) = 'ASC', -- 'ASC', 'DESC'
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = IIF(@PageNumber > 1, (@PageNumber - 1) * @PageSize, 0);
    DECLARE @NormSortBy VARCHAR(30) = UPPER(LTRIM(RTRIM(ISNULL(@SortBy, 'NAME'))));
    DECLARE @NormSortDir VARCHAR(10) = UPPER(LTRIM(RTRIM(ISNULL(@SortDir, 'ASC'))));

    WITH ProductList AS (
        SELECT 
            P.IDProduct,
            P.Name AS ProductName,
            P.Description,
            P.MainImageUrl,
            P.IDCategory,
            C.Name AS CategoryName,
            MIN(PV.Price) AS MinPrice,
            MAX(PV.Price) AS MaxPrice,
            SUM(PV.PhysicalStock) AS TotalPhysicalStock,
            ISNULL(SUM(FAS.AvailableStock), 0) AS TotalAvailableStock,
            P.CreatedAt
        FROM dbo.Products P
        JOIN dbo.Categories C ON P.IDCategory = C.IDCategory
        JOIN dbo.ProductVariants PV ON P.IDProduct = PV.IDProduct AND PV.IsActive = 1
        CROSS APPLY dbo.FU_Catalog_AvailableStock(PV.IDVariant) FAS
        WHERE P.IsActive = 1
          AND C.IsActive = 1
          AND (@SearchText IS NULL OR P.Name LIKE '%' + @SearchText + '%' OR P.Description LIKE '%' + @SearchText + '%')
          AND (@IDCategory IS NULL OR P.IDCategory = @IDCategory)
          AND (@MinPrice IS NULL OR PV.Price >= @MinPrice)
          AND (@MaxPrice IS NULL OR PV.Price <= @MaxPrice)
        GROUP BY P.IDProduct, P.Name, P.Description, P.MainImageUrl, P.IDCategory, C.Name, P.CreatedAt
        HAVING (@OnlyInStock = 0 OR SUM(FAS.AvailableStock) > 0)
    ),
    CountedList AS (
        SELECT COUNT(1) OVER() AS TotalRows, * FROM ProductList
    )
    SELECT * FROM CountedList
    ORDER BY 
        IIF(@NormSortBy = 'NAME' AND @NormSortDir = 'ASC', ProductName, NULL) ASC,
        IIF(@NormSortBy = 'NAME' AND @NormSortDir = 'DESC', ProductName, NULL) DESC,
        IIF(@NormSortBy = 'PRICE' AND @NormSortDir = 'ASC', MinPrice, NULL) ASC,
        IIF(@NormSortBy = 'PRICE' AND @NormSortDir = 'DESC', MinPrice, NULL) DESC,
        IIF(@NormSortBy = 'NEWEST' AND @NormSortDir = 'ASC', CreatedAt, NULL) ASC,
        IIF(@NormSortBy = 'NEWEST' AND @NormSortDir <> 'ASC', CreatedAt, NULL) DESC,
        IIF(@NormSortBy NOT IN ('NAME', 'PRICE', 'NEWEST'), ProductName, NULL) ASC,
        IDProduct ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ============================================================================
-- 3. SHOPPING CART MODULE (RF-04)
-- ============================================================================

CREATE OR ALTER PROCEDURE dbo.SP_Cart_GetOrCreate
    @IDUser INT = NULL,
    @GuestToken VARCHAR(100) = NULL,
    @IDCart INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IDUser IS NOT NULL
    BEGIN
        SELECT @IDCart = IDCart 
        FROM dbo.Carts 
        WHERE IDUser = @IDUser AND IsActive = 1 AND Status = 'ACTIVE';

        IF @IDCart IS NULL
        BEGIN
            INSERT INTO dbo.Carts (IDUser, Status, IsActive, CreatedAt, LastActivityAt)
            VALUES (@IDUser, 'ACTIVE', 1, SYSUTCDATETIME(), SYSUTCDATETIME());
            SET @IDCart = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.Carts SET LastActivityAt = SYSUTCDATETIME() WHERE IDCart = @IDCart;
        END
    END
    ELSE IF @GuestToken IS NOT NULL
    BEGIN
        SELECT @IDCart = IDCart 
        FROM dbo.Carts 
        WHERE GuestToken = @GuestToken AND IsActive = 1 AND Status = 'ACTIVE';

        IF @IDCart IS NULL
        BEGIN
            INSERT INTO dbo.Carts (GuestToken, Status, IsActive, CreatedAt, LastActivityAt)
            VALUES (@GuestToken, 'ACTIVE', 1, SYSUTCDATETIME(), SYSUTCDATETIME());
            SET @IDCart = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.Carts SET LastActivityAt = SYSUTCDATETIME() WHERE IDCart = @IDCart;
        END
    END
    ELSE
    BEGIN
        RAISERROR('INVALID_CART_REQUEST: Either User ID or Guest Token must be supplied.', 16, 1);
    END
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Cart_AddItem
    @IDCart INT,
    @IDVariant INT,
    @Quantity INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Quantity <= 0
    BEGIN
        RAISERROR('INVALID_QUANTITY: Requested quantity must be greater than zero.', 16, 1);
        RETURN;
    END

    -- Check availability through FU_Catalog_AvailableStock
    DECLARE @AvailableStock INT;
    SELECT @AvailableStock = AvailableStock FROM dbo.FU_Catalog_AvailableStock(@IDVariant);

    IF @AvailableStock IS NULL
    BEGIN
        RAISERROR('VARIANT_NOT_FOUND: Product variant not found.', 16, 1);
        RETURN;
    END

    DECLARE @CurrentCartQty INT = 0;
    SELECT @CurrentCartQty = Quantity FROM dbo.CartItems WHERE IDCart = @IDCart AND IDVariant = @IDVariant;

    IF (@CurrentCartQty + @Quantity) > @AvailableStock
    BEGIN
        RAISERROR('INSUFFICIENT_STOCK: Requested quantity exceeds currently available stock.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.CartItems WHERE IDCart = @IDCart AND IDVariant = @IDVariant)
        BEGIN
            UPDATE dbo.CartItems 
            SET Quantity = Quantity + @Quantity 
            WHERE IDCart = @IDCart AND IDVariant = @IDVariant;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.CartItems (IDCart, IDVariant, Quantity, AddedAt)
            VALUES (@IDCart, @IDVariant, @Quantity, SYSUTCDATETIME());
        END

        UPDATE dbo.Carts SET LastActivityAt = SYSUTCDATETIME() WHERE IDCart = @IDCart;
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Cart_UpdateItemQuantity
    @IDCart INT,
    @IDVariant INT,
    @NewQuantity INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @NewQuantity <= 0
    BEGIN
        -- Auto remove if quantity <= 0
        DELETE FROM dbo.CartItems WHERE IDCart = @IDCart AND IDVariant = @IDVariant;
        UPDATE dbo.Carts SET LastActivityAt = SYSUTCDATETIME() WHERE IDCart = @IDCart;
        RETURN;
    END

    DECLARE @AvailableStock INT;
    SELECT @AvailableStock = AvailableStock FROM dbo.FU_Catalog_AvailableStock(@IDVariant);

    IF @NewQuantity > @AvailableStock
    BEGIN
        RAISERROR('INSUFFICIENT_STOCK: Requested quantity exceeds currently available stock.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.CartItems 
        SET Quantity = @NewQuantity 
        WHERE IDCart = @IDCart AND IDVariant = @IDVariant;

        UPDATE dbo.Carts SET LastActivityAt = SYSUTCDATETIME() WHERE IDCart = @IDCart;
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Cart_RemoveItem
    @IDCart INT,
    @IDVariant INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.CartItems 
    WHERE IDCart = @IDCart AND IDVariant = @IDVariant;

    UPDATE dbo.Carts 
    SET LastActivityAt = SYSUTCDATETIME() 
    WHERE IDCart = @IDCart;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Cart_Clear
    @IDCart INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.CartItems 
    WHERE IDCart = @IDCart;

    UPDATE dbo.Carts 
    SET LastActivityAt = SYSUTCDATETIME() 
    WHERE IDCart = @IDCart;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Cart_GetCartDetails
    @IDCart INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Return Cart Header and calculated totals
    SELECT 
        C.IDCart,
        C.IDUser,
        C.GuestToken,
        C.Status,
        C.LastActivityAt,
        ISNULL(SUM(CI.Quantity * PV.Price), 0.00) AS GrossSubtotal,
        ROUND(ISNULL(SUM(CI.Quantity * PV.Price), 0.00) / 1.12, 2) AS NetSubtotal,
        ROUND(ISNULL(SUM(CI.Quantity * PV.Price), 0.00) - (ISNULL(SUM(CI.Quantity * PV.Price), 0.00) / 1.12), 2) AS IVATaxAmount,
        ISNULL(SUM(CI.Quantity * PV.Price), 0.00) AS Total
    FROM dbo.Carts C
    LEFT JOIN dbo.CartItems CI ON C.IDCart = CI.IDCart
    LEFT JOIN dbo.ProductVariants PV ON CI.IDVariant = PV.IDVariant
    WHERE C.IDCart = @IDCart
    GROUP BY C.IDCart, C.IDUser, C.GuestToken, C.Status, C.LastActivityAt;

    -- Return Cart Items
    SELECT 
        CI.IDCartItem,
        CI.IDVariant,
        PV.SKU,
        P.Name AS ProductName,
        P.MainImageUrl,
        PV.AttributesJson,
        PV.Price AS UnitPrice,
        CI.Quantity,
        CAST((CI.Quantity * PV.Price) AS DECIMAL(12,2)) AS LineTotal,
        FAS.AvailableStock
    FROM dbo.CartItems CI
    JOIN dbo.ProductVariants PV ON CI.IDVariant = PV.IDVariant
    JOIN dbo.Products P ON PV.IDProduct = P.IDProduct
    CROSS APPLY dbo.FU_Catalog_AvailableStock(PV.IDVariant) FAS
    WHERE CI.IDCart = @IDCart;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Cart_MergeGuestCart
    @GuestToken VARCHAR(100),
    @IDUser INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @GuestCartID INT;
    DECLARE @UserCartID INT;

    SELECT @GuestCartID = IDCart FROM dbo.Carts WHERE GuestToken = @GuestToken AND IsActive = 1 AND Status = 'ACTIVE';
    IF @GuestCartID IS NULL RETURN;

    EXEC dbo.SP_Cart_GetOrCreate @IDUser = @IDUser, @GuestToken = NULL, @IDCart = @UserCartID OUTPUT;

    BEGIN TRANSACTION;
        -- Upsert items from guest cart to user cart
        MERGE dbo.CartItems AS Target
        USING (SELECT IDVariant, Quantity FROM dbo.CartItems WHERE IDCart = @GuestCartID) AS Source
        ON (Target.IDCart = @UserCartID AND Target.IDVariant = Source.IDVariant)
        WHEN MATCHED THEN
            UPDATE SET Target.Quantity = Target.Quantity + Source.Quantity
        WHEN NOT MATCHED THEN
            INSERT (IDCart, IDVariant, Quantity, AddedAt)
            VALUES (@UserCartID, Source.IDVariant, Source.Quantity, SYSUTCDATETIME());

        -- Deactivate guest cart
        UPDATE dbo.Carts SET IsActive = 0, Status = 'CONVERTED' WHERE IDCart = @GuestCartID;
    COMMIT TRANSACTION;
END
GO

-- ============================================================================
-- 4. INVENTORY, RESERVATIONS & KARDEX MODULE (RF-03, RF-06)
-- ============================================================================

CREATE OR ALTER PROCEDURE dbo.SP_Inventory_ReserveStock
    @IDCart INT,
    @ReservationMinutes INT = 15
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @InitialTranCount INT = @@TRANCOUNT;
    IF @InitialTranCount = 0
        BEGIN TRANSACTION;

    -- Release previous active reservations for this cart first
    UPDATE dbo.StockReservations
    SET Status = 'CANCELLED'
    WHERE IDCart = @IDCart AND Status = 'ACTIVE';

    -- Check and acquire pessimistic locks (UPDLOCK, HOLDLOCK) on all variants in cart
    DECLARE @VariantReservations TABLE (
        IDVariant INT NOT NULL,
        Quantity INT NOT NULL,
        PhysicalStock INT NOT NULL,
        ActiveReserved INT NOT NULL
    );

    INSERT INTO @VariantReservations (IDVariant, Quantity, PhysicalStock, ActiveReserved)
    SELECT 
        PV.IDVariant,
        CI.Quantity,
        PV.PhysicalStock,
        ISNULL(SUM(SR.Quantity), 0) AS ActiveReserved
    FROM dbo.CartItems CI
    JOIN dbo.ProductVariants PV WITH (UPDLOCK, HOLDLOCK) ON CI.IDVariant = PV.IDVariant
    LEFT JOIN dbo.StockReservations SR WITH (UPDLOCK, HOLDLOCK) 
        ON PV.IDVariant = SR.IDVariant AND SR.Status = 'ACTIVE' AND SR.ExpiresAt > SYSUTCDATETIME()
    WHERE CI.IDCart = @IDCart
    GROUP BY PV.IDVariant, CI.Quantity, PV.PhysicalStock;

    -- Verify if any variant exceeds available stock
    IF EXISTS (
        SELECT 1 FROM @VariantReservations 
        WHERE (PhysicalStock - ActiveReserved) < Quantity
    )
    BEGIN
        IF @InitialTranCount = 0 AND @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        RAISERROR('OVERSOLD_ERROR: One or more products in your cart no longer have enough available stock.', 16, 1);
        RETURN;
    END

    -- Create active stock reservation for each item
    INSERT INTO dbo.StockReservations (IDVariant, IDCart, Quantity, ReservedAt, ExpiresAt, Status)
    SELECT 
        IDVariant, 
        @IDCart, 
        Quantity, 
        SYSUTCDATETIME(), 
        DATEADD(MINUTE, @ReservationMinutes, SYSUTCDATETIME()), 
        'ACTIVE'
    FROM @VariantReservations;

    IF @InitialTranCount = 0
        COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Inventory_ReleaseExpiredReservations
    @ReleasedCount INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.StockReservations
    SET Status = 'EXPIRED'
    WHERE Status = 'ACTIVE' AND ExpiresAt <= SYSUTCDATETIME();

    SET @ReleasedCount = @@ROWCOUNT;
END
GO

-- ============================================================================
-- Procedure: dbo.SP_Inventory_AdjustStockManual
-- Module: RF-03 (Inventory Adjustments & Kardex Audit)
-- Description: Performs positive or negative manual stock adjustment with mandatory justification.
--              Guarantees non-negative stock balance and audits entry in Kardex ledger.
-- Parameters:
--   @IDVariant INT: Product variant ID
--   @QuantityChange INT: Quantity to adjust (positive or negative, non-zero)
--   @Reason NVARCHAR(255): Mandatory justification string
--   @IDUser INT: Administrator or Inventory Manager user ID
-- Throws:
--   INVALID_QUANTITY (16, 1)
--   MANDATORY_REASON (16, 1)
--   VARIANT_NOT_FOUND (16, 1)
--   NEGATIVE_STOCK_ERROR (16, 1)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.SP_Inventory_AdjustStockManual
    @IDVariant INT,
    @QuantityChange INT, -- Positive for increase, negative for decrease
    @Reason NVARCHAR(255),
    @IDUser INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @QuantityChange = 0
    BEGIN
        RAISERROR('INVALID_QUANTITY: Adjustment quantity cannot be zero.', 16, 1);
        RETURN;
    END

    IF @Reason IS NULL OR LTRIM(RTRIM(@Reason)) = ''
    BEGIN
        RAISERROR('MANDATORY_REASON: Manual adjustments require a descriptive justification.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        DECLARE @OldStock INT;
        SELECT @OldStock = PhysicalStock 
        FROM dbo.ProductVariants WITH (UPDLOCK, HOLDLOCK)
        WHERE IDVariant = @IDVariant;

        IF @OldStock IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('VARIANT_NOT_FOUND: Product variant does not exist.', 16, 1);
            RETURN;
        END

        DECLARE @NewStock INT = @OldStock + @QuantityChange;
        IF @NewStock < 0
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('NEGATIVE_STOCK_ERROR: Manual adjustment cannot leave stock below zero.', 16, 1);
            RETURN;
        END

        -- Update variant physical stock
        UPDATE dbo.ProductVariants 
        SET PhysicalStock = @NewStock, UpdatedAt = SYSUTCDATETIME()
        WHERE IDVariant = @IDVariant;

        -- Record movement in Kardex
        INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, MovementDate)
        VALUES (
            @IDVariant,
            IIF(@QuantityChange > 0, 'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT'),
            ABS(@QuantityChange),
            @OldStock,
            @NewStock,
            @Reason,
            @IDUser,
            SYSUTCDATETIME()
        );

        -- Audit log entry
        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, PreviousValueJson, NewValueJson, LoggedAt)
        VALUES (
            @IDUser, 'INVENTORY', 'ProductVariants', CAST(@IDVariant AS VARCHAR(50)), 'UPDATE',
            (SELECT @OldStock AS PhysicalStock FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT @NewStock AS PhysicalStock FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            SYSUTCDATETIME()
        );
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Inventory_GetKardex
    @IDVariant INT = NULL,
    @MovementType VARCHAR(30) = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    WITH KardexEntries AS (
        SELECT 
            K.IDKardex,
            K.IDVariant,
            PV.SKU,
            P.Name AS ProductName,
            PV.AttributesJson,
            K.MovementType,
            K.Quantity,
            K.PreviousBalance,
            K.NewBalance,
            K.Reason,
            K.IDUser,
            U.FullName AS OperatorName,
            K.IDOrder,
            K.MovementDate
        FROM dbo.Kardex K
        JOIN dbo.ProductVariants PV ON K.IDVariant = PV.IDVariant
        JOIN dbo.Products P ON PV.IDProduct = P.IDProduct
        JOIN dbo.Users U ON K.IDUser = U.IDUser
        WHERE (@IDVariant IS NULL OR K.IDVariant = @IDVariant)
          AND (@MovementType IS NULL OR K.MovementType = @MovementType)
          AND (@StartDate IS NULL OR K.MovementDate >= @StartDate)
          AND (@EndDate IS NULL OR K.MovementDate <= @EndDate)
    ),
    CountedData AS (
        SELECT COUNT(1) OVER() AS TotalRows, * FROM KardexEntries
    )
    SELECT * FROM CountedData
    ORDER BY MovementDate DESC, IDKardex DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Inventory_GetStockOverview
    @IDCategory INT = NULL,
    @SearchTerm NVARCHAR(100) = NULL,
    @LowStockOnly BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    WITH StockEntries AS (
        SELECT 
            PV.IDVariant,
            PV.IDProduct,
            P.Name AS ProductName,
            C.Name AS CategoryName,
            PV.SKU,
            PV.Price,
            PV.PhysicalStock,
            FAS.ReservedQuantity AS ReservedStock,
            FAS.AvailableStock AS AvailableStock,
            PV.IsActive
        FROM dbo.ProductVariants PV
        JOIN dbo.Products P ON PV.IDProduct = P.IDProduct
        JOIN dbo.Categories C ON P.IDCategory = C.IDCategory
        CROSS APPLY dbo.FU_Catalog_AvailableStock(PV.IDVariant) FAS
        WHERE (@IDCategory IS NULL OR P.IDCategory = @IDCategory)
          AND (@SearchTerm IS NULL OR P.Name LIKE '%' + @SearchTerm + '%' OR PV.SKU LIKE '%' + @SearchTerm + '%')
          AND (@LowStockOnly = 0 OR FAS.AvailableStock <= 5)
    ),
    CountedData AS (
        SELECT COUNT(1) OVER() AS TotalRows, * FROM StockEntries
    )
    SELECT * FROM CountedData
    ORDER BY ProductName ASC, SKU ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ============================================================================
-- 5. COUPONS MODULE (RF-05)
-- ============================================================================

CREATE OR ALTER PROCEDURE dbo.SP_Coupons_Create
    @Code VARCHAR(50),
    @DiscountType VARCHAR(20),
    @DiscountValue DECIMAL(12,2),
    @MinPurchaseAmount DECIMAL(12,2) = 0.00,
    @StartDate DATETIME2(3),
    @EndDate DATETIME2(3),
    @MaxTotalUses INT,
    @MaxUsesPerClient INT = 1,
    @IDCategory INT = NULL,
    @UserID INT,
    @NewIDCoupon INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (SELECT 1 FROM dbo.Coupons WHERE Code = @Code)
    BEGIN
        RAISERROR('COUPON_CODE_EXISTS: Coupon code already exists.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        INSERT INTO dbo.Coupons (
            Code, DiscountType, DiscountValue, MinPurchaseAmount, 
            StartDate, EndDate, MaxTotalUses, CurrentUses, 
            MaxUsesPerClient, IDCategory, IsActive, CreatedAt
        )
        VALUES (
            @Code, @DiscountType, @DiscountValue, @MinPurchaseAmount,
            @StartDate, @EndDate, @MaxTotalUses, 0,
            @MaxUsesPerClient, @IDCategory, 1, SYSUTCDATETIME()
        );

        SET @NewIDCoupon = SCOPE_IDENTITY();

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'COUPONS', 'Coupons', CAST(@NewIDCoupon AS VARCHAR(50)), 'CREATE',
                (SELECT @Code AS Code, @DiscountType AS DiscountType, @DiscountValue AS DiscountValue FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Coupons_ValidateAndPreview
    @CouponCode VARCHAR(50),
    @IDUser INT,
    @EligibleSubtotal DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        IDCoupon,
        Code,
        ValidationStatus,
        CalculatedDiscount
    FROM dbo.FU_Coupons_CalculateDiscount(@CouponCode, @IDUser, @EligibleSubtotal);
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Coupons_List
    @OnlyActive BIT = 0,
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    WITH CouponList AS (
        SELECT 
            CP.IDCoupon,
            CP.Code,
            CP.DiscountType,
            CP.DiscountValue,
            CP.MinPurchaseAmount,
            CP.StartDate,
            CP.EndDate,
            CP.MaxTotalUses,
            CP.CurrentUses,
            CP.MaxUsesPerClient,
            CP.IDCategory,
            C.Name AS CategoryName,
            CP.IsActive,
            CP.CreatedAt
        FROM dbo.Coupons CP
        LEFT JOIN dbo.Categories C ON CP.IDCategory = C.IDCategory
        WHERE (@OnlyActive = 0 OR CP.IsActive = 1)
    ),
    CountedList AS (
        SELECT COUNT(1) OVER() AS TotalRows, * FROM CouponList
    )
    SELECT * FROM CountedList
    ORDER BY CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Coupons_GetByID
    @IDCoupon INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        CP.IDCoupon,
        CP.Code,
        CP.DiscountType,
        CP.DiscountValue,
        CP.MinPurchaseAmount,
        CP.StartDate,
        CP.EndDate,
        CP.MaxTotalUses,
        CP.CurrentUses,
        CP.MaxUsesPerClient,
        CP.IDCategory,
        C.Name AS CategoryName,
        CP.IsActive,
        CP.CreatedAt
    FROM dbo.Coupons CP
    LEFT JOIN dbo.Categories C ON CP.IDCategory = C.IDCategory
    WHERE CP.IDCoupon = @IDCoupon;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Coupons_Update
    @IDCoupon INT,
    @DiscountType VARCHAR(20),
    @DiscountValue DECIMAL(12,2),
    @MinPurchaseAmount DECIMAL(12,2),
    @StartDate DATETIME2(3),
    @EndDate DATETIME2(3),
    @MaxTotalUses INT,
    @MaxUsesPerClient INT,
    @IDCategory INT = NULL,
    @IsActive BIT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Coupons WHERE IDCoupon = @IDCoupon)
    BEGIN
        RAISERROR('COUPON_NOT_FOUND: Coupon does not exist.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.Coupons
        SET DiscountType = @DiscountType,
            DiscountValue = @DiscountValue,
            MinPurchaseAmount = @MinPurchaseAmount,
            StartDate = @StartDate,
            EndDate = @EndDate,
            MaxTotalUses = @MaxTotalUses,
            MaxUsesPerClient = @MaxUsesPerClient,
            IDCategory = @IDCategory,
            IsActive = @IsActive
        WHERE IDCoupon = @IDCoupon;

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'COUPONS', 'Coupons', CAST(@IDCoupon AS VARCHAR(50)), 'UPDATE',
                (SELECT @DiscountType AS DiscountType, @DiscountValue AS DiscountValue, @IsActive AS IsActive FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Coupons_Deactivate
    @IDCoupon INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
        UPDATE dbo.Coupons 
        SET IsActive = 0 
        WHERE IDCoupon = @IDCoupon;

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@UserID, 'COUPONS', 'Coupons', CAST(@IDCoupon AS VARCHAR(50)), 'DEACTIVATE',
                (SELECT @IDCoupon AS IDCoupon, 0 AS IsActive FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

-- ============================================================================
-- 6. ORDERS, CHECKOUT & RETURNS (RF-06, RF-07) - STRICT ATOMICITY
-- ============================================================================

-- ============================================================================
-- Procedure: dbo.SP_Orders_CreateOrder
-- Module: RF-06 (Checkout & Atomic Orders)
-- Description: Creates an order atomically under a serializable transaction.
--              Enforces idempotency, locks & deducts physical stock with UPDLOCK,
--              writes Kardex SALE_EXIT entries, applies coupons, and transitions cart.
-- Parameters:
--   @IDUser INT: Authenticated customer ID
--   @IDCart INT: Active cart ID to convert
--   @IDDeliveryAddress INT: User delivery address ID
--   @IdempotencyKey VARCHAR(100): Unique client idempotency key
--   @CouponCode VARCHAR(50) NULL: Optional coupon code
--   @NewIDOrder INT OUTPUT: Generated Order ID
--   @GeneratedOrderNumber VARCHAR(30) OUTPUT: Formatted order number (ORD-YYYY-XXXXXX)
-- Throws:
--   INVALID_ADDRESS (16, 1)
--   EMPTY_CART (16, 1)
--   INSUFFICIENT_STOCK (16, 1)
--   INVALID_COUPON / COUPON_REJECTED (16, 1)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.SP_Orders_CreateOrder
    @IDUser INT,
    @IDCart INT,
    @IDDeliveryAddress INT,
    @IdempotencyKey VARCHAR(100),
    @CouponCode VARCHAR(50) = NULL,
    @NewIDOrder INT OUTPUT,
    @GeneratedOrderNumber VARCHAR(30) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- ========================================================================
    -- 1. Idempotency Check: if key already exists, return previous order details
    -- ========================================================================
    SELECT @NewIDOrder = IDOrder, @GeneratedOrderNumber = OrderNumber
    FROM dbo.Orders
    WHERE IdempotencyKey = @IdempotencyKey;

    IF @NewIDOrder IS NOT NULL
    BEGIN
        RETURN; -- Seamless idempotent response
    END

    -- Verify cart is active and belongs to the authenticated user
    IF NOT EXISTS (SELECT 1 FROM dbo.Carts WHERE IDCart = @IDCart AND IDUser = @IDUser AND Status = 'ACTIVE' AND IsActive = 1)
    BEGIN
        RAISERROR('EMPTY_CART: Shopping cart is not active or does not belong to the user.', 16, 1);
        RETURN;
    END

    -- Verify delivery address belongs to user
    IF NOT EXISTS (SELECT 1 FROM dbo.Addresses WHERE IDAddress = @IDDeliveryAddress AND IDUser = @IDUser AND IsActive = 1)
    BEGIN
        RAISERROR('INVALID_ADDRESS: Delivery address does not belong to the authenticated user.', 16, 1);
        RETURN;
    END

    -- Snapshot address
    DECLARE @AddressSnapshot NVARCHAR(MAX);
    SELECT @AddressSnapshot = (
        SELECT RecipientName, AddressLine1, AddressLine2, Municipality, Department, PostalCode, ContactPhone
        FROM dbo.Addresses WHERE IDAddress = @IDDeliveryAddress
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    BEGIN TRANSACTION;

        -- ====================================================================
        -- 2. Verify and Lock Active Reservations (UPDLOCK)
        -- ====================================================================
        EXEC dbo.SP_Inventory_ReserveStock @IDCart = @IDCart, @ReservationMinutes = 15;

        -- Calculate gross subtotal from cart items
        DECLARE @GrossTotal DECIMAL(12,2);
        SELECT @GrossTotal = SUM(CI.Quantity * PV.Price)
        FROM dbo.CartItems CI
        JOIN dbo.ProductVariants PV ON CI.IDVariant = PV.IDVariant
        WHERE CI.IDCart = @IDCart;

        IF @GrossTotal IS NULL OR @GrossTotal <= 0
        BEGIN
            ROLLBACK TRANSACTION;
            RAISERROR('EMPTY_CART: Cannot checkout an empty shopping cart.', 16, 1);
            RETURN;
        END

        -- ====================================================================
        -- 3. Coupon Validation and Concurrency Lock (UPDLOCK, HOLDLOCK)
        -- ====================================================================
        DECLARE @IDCoupon INT = NULL;
        DECLARE @CouponCategoryID INT = NULL;
        DECLARE @EligibleSubtotal DECIMAL(12,2) = @GrossTotal;
        DECLARE @DiscountAmount DECIMAL(12,2) = 0.00;

        IF @CouponCode IS NOT NULL AND LTRIM(RTRIM(@CouponCode)) <> ''
        BEGIN
            SELECT @IDCoupon = IDCoupon, @CouponCategoryID = IDCategory
            FROM dbo.Coupons WITH (UPDLOCK, HOLDLOCK)
            WHERE Code = @CouponCode;

            IF @IDCoupon IS NULL
            BEGIN
                ROLLBACK TRANSACTION;
                RAISERROR('INVALID_COUPON: The specified coupon code does not exist.', 16, 1);
                RETURN;
            END

            IF @CouponCategoryID IS NOT NULL
            BEGIN
                SELECT @EligibleSubtotal = ISNULL(SUM(CI.Quantity * PV.Price), 0.00)
                FROM dbo.CartItems CI
                JOIN dbo.ProductVariants PV ON CI.IDVariant = PV.IDVariant
                JOIN dbo.Products P ON PV.IDProduct = P.IDProduct
                WHERE CI.IDCart = @IDCart AND P.IDCategory = @CouponCategoryID;
            END

            DECLARE @ValidationStatus VARCHAR(50);
            SELECT 
                @ValidationStatus = ValidationStatus,
                @DiscountAmount = CalculatedDiscount
            FROM dbo.FU_Coupons_CalculateDiscount(@CouponCode, @IDUser, @EligibleSubtotal);

            IF @ValidationStatus <> 'VALID'
            BEGIN
                ROLLBACK TRANSACTION;
                RAISERROR('COUPON_REJECTED: Coupon condition not met: %s', 16, 1, @ValidationStatus);
                RETURN;
            END

            -- Increment coupon current uses atomically
            UPDATE dbo.Coupons 
            SET CurrentUses = CurrentUses + 1 
            WHERE IDCoupon = @IDCoupon;
        END

        -- Calculate final totals (cannot drop below 0.00)
        DECLARE @FinalGrandTotal DECIMAL(12,2) = @GrossTotal - @DiscountAmount;
        IF @FinalGrandTotal < 0.00 SET @FinalGrandTotal = 0.00;

        DECLARE @NetSubtotal DECIMAL(12,2);
        DECLARE @IVATaxAmount DECIMAL(12,2);

        SELECT 
            @NetSubtotal = NetSubtotal,
            @IVATaxAmount = IVATaxAmount
        FROM dbo.FU_Orders_CalculateTaxes(@FinalGrandTotal);

        -- Generate unique readable order number (ORD-YYYY-XXXXXX)
        SET @GeneratedOrderNumber = 'ORD-' + CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4)) + '-' + 
                                    RIGHT('000000' + CAST(NEXT VALUE FOR dbo.OrderSequence AS VARCHAR(10)), 6);

        -- ====================================================================
        -- 4. Create Order Header
        -- ====================================================================
        INSERT INTO dbo.Orders (
            OrderNumber, IDUser, IDCart, IDDeliveryAddress, 
            ShippingAddressSnapshot, NetSubtotal, IVATaxAmount, 
            DiscountTotal, GrandTotal, IDCoupon, Status, 
            IdempotencyKey, CreatedAt
        )
        VALUES (
            @GeneratedOrderNumber, @IDUser, @IDCart, @IDDeliveryAddress,
            @AddressSnapshot, @NetSubtotal, @IVATaxAmount,
            @DiscountAmount, @FinalGrandTotal, @IDCoupon, 'PAID',
            @IdempotencyKey, SYSUTCDATETIME()
        );

        SET @NewIDOrder = SCOPE_IDENTITY();

        -- ====================================================================
        -- 5. Insert Order Items & Deduct Physical Stock with Kardex
        -- ====================================================================
        INSERT INTO dbo.OrderItems (
            IDOrder, IDVariant, HistoricalSKU, HistoricalProductName, 
            UnitPrice, QuantitySold, QuantityReturned, LineTotal
        )
        SELECT 
            @NewIDOrder,
            PV.IDVariant,
            PV.SKU,
            P.Name,
            PV.Price,
            CI.Quantity,
            0,
            CAST((CI.Quantity * PV.Price) AS DECIMAL(12,2))
        FROM dbo.CartItems CI
        JOIN dbo.ProductVariants PV ON CI.IDVariant = PV.IDVariant
        JOIN dbo.Products P ON PV.IDProduct = P.IDProduct
        WHERE CI.IDCart = @IDCart;

        -- Record physical stock deduction and Kardex entries
        DECLARE @VariantID INT, @SoldQty INT, @SKU VARCHAR(50);
        DECLARE ItemCursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT CI.IDVariant, CI.Quantity, PV.SKU
            FROM dbo.CartItems CI
            JOIN dbo.ProductVariants PV ON CI.IDVariant = PV.IDVariant
            WHERE CI.IDCart = @IDCart;

        OPEN ItemCursor;
        FETCH NEXT FROM ItemCursor INTO @VariantID, @SoldQty, @SKU;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            DECLARE @PrevBalance INT;
            SELECT @PrevBalance = PhysicalStock 
            FROM dbo.ProductVariants WITH (UPDLOCK) 
            WHERE IDVariant = @VariantID;

            IF @PrevBalance < @SoldQty
            BEGIN
                CLOSE ItemCursor;
                DEALLOCATE ItemCursor;
                ROLLBACK TRANSACTION;
                RAISERROR('INSUFFICIENT_STOCK: Insufficient physical stock for SKU %s.', 16, 1, @SKU);
                RETURN;
            END

            UPDATE dbo.ProductVariants
            SET PhysicalStock = PhysicalStock - @SoldQty, UpdatedAt = SYSUTCDATETIME()
            WHERE IDVariant = @VariantID;

            INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, IDOrder, MovementDate)
            VALUES (
                @VariantID, 'SALE_EXIT', @SoldQty, @PrevBalance, @PrevBalance - @SoldQty,
                'Order confirmed: ' + @GeneratedOrderNumber, @IDUser, @NewIDOrder, SYSUTCDATETIME()
            );

            FETCH NEXT FROM ItemCursor INTO @VariantID, @SoldQty, @SKU;
        END

        CLOSE ItemCursor;
        DEALLOCATE ItemCursor;

        -- ====================================================================
        -- 6. Register Coupon Usage (if coupon applied)
        -- ====================================================================
        IF @IDCoupon IS NOT NULL
        BEGIN
            INSERT INTO dbo.CouponUsages (IDCoupon, IDUser, IDOrder, DiscountApplied, UsedAt)
            VALUES (@IDCoupon, @IDUser, @NewIDOrder, @DiscountAmount, SYSUTCDATETIME());
        END

        -- ====================================================================
        -- 7. Mark Reservations as Completed & Cart as Converted
        -- ====================================================================
        UPDATE dbo.StockReservations
        SET Status = 'COMPLETED', IDOrder = @NewIDOrder
        WHERE IDCart = @IDCart AND Status = 'ACTIVE';

        UPDATE dbo.Carts
        SET Status = 'CONVERTED', IsActive = 0, LastActivityAt = SYSUTCDATETIME()
        WHERE IDCart = @IDCart;

        -- Initial order status history
        INSERT INTO dbo.OrderStatusHistory (IDOrder, PreviousStatus, NewStatus, IDUser, Reason, ChangedAt)
        VALUES (@NewIDOrder, NULL, 'PAID', @IDUser, 'Order paid and confirmed successfully', SYSUTCDATETIME());

    COMMIT TRANSACTION;
END
GO

-- ============================================================================
-- Procedure: dbo.SP_Orders_AdvanceStatus
-- Module: RF-07 (Order State Machine & Lifecycle)
-- Description: Transitions order status adhering strictly to the allowed state machine.
--              Reverts physical stock and registers Kardex POSITIVE_ADJUSTMENT if cancelled.
-- Parameters:
--   @IDOrder INT: Order ID to transition
--   @NewStatus VARCHAR(30): Target status (IN_PREPARATION, DISPATCHED, DELIVERED, CANCELLED)
--   @Reason NVARCHAR(255) NULL: Optional transition or cancellation reason
--   @IDUser INT: Operator or Administrator executing transition
-- Throws:
--   ORDER_NOT_FOUND (16, 1)
--   INVALID_STATUS_TRANSITION (16, 1)
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.SP_Orders_AdvanceStatus
    @IDOrder INT,
    @NewStatus VARCHAR(30),
    @Reason NVARCHAR(255) = NULL,
    @IDUser INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CurrentStatus VARCHAR(30);
    DECLARE @OrderCouponID INT;
    SELECT @CurrentStatus = Status, @OrderCouponID = IDCoupon FROM dbo.Orders WHERE IDOrder = @IDOrder;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR('ORDER_NOT_FOUND: Order does not exist.', 16, 1);
        RETURN;
    END

    -- Strict State Machine Transition Verification (RF-07)
    DECLARE @IsValidTransition BIT = 0;

    IF @CurrentStatus = 'PAID' AND @NewStatus IN ('IN_PREPARATION', 'CANCELLED') SET @IsValidTransition = 1;
    IF @CurrentStatus = 'IN_PREPARATION' AND @NewStatus IN ('DISPATCHED', 'CANCELLED') SET @IsValidTransition = 1;
    IF @CurrentStatus = 'DISPATCHED' AND @NewStatus = 'DELIVERED' SET @IsValidTransition = 1;

    IF @IsValidTransition = 0
    BEGIN
        RAISERROR('INVALID_STATUS_TRANSITION: Transition from %s to %s is not permitted.', 16, 1, @CurrentStatus, @NewStatus);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.Orders
        SET Status = @NewStatus, UpdatedAt = SYSUTCDATETIME()
        WHERE IDOrder = @IDOrder;

        INSERT INTO dbo.OrderStatusHistory (IDOrder, PreviousStatus, NewStatus, IDUser, Reason, ChangedAt)
        VALUES (@IDOrder, @CurrentStatus, @NewStatus, @IDUser, @Reason, SYSUTCDATETIME());

        -- If cancelled, revert stock, Kardex, and coupon usage!
        IF @NewStatus = 'CANCELLED'
        BEGIN
            DECLARE @VariantID INT, @SoldQty INT;
            DECLARE CancelCursor CURSOR LOCAL FAST_FORWARD FOR
                SELECT IDVariant, QuantitySold FROM dbo.OrderItems WHERE IDOrder = @IDOrder;

            OPEN CancelCursor;
            FETCH NEXT FROM CancelCursor INTO @VariantID, @SoldQty;

            WHILE @@FETCH_STATUS = 0
            BEGIN
                DECLARE @PrevBal INT;
                SELECT @PrevBal = PhysicalStock FROM dbo.ProductVariants WITH (UPDLOCK) WHERE IDVariant = @VariantID;

                UPDATE dbo.ProductVariants 
                SET PhysicalStock = PhysicalStock + @SoldQty, UpdatedAt = SYSUTCDATETIME()
                WHERE IDVariant = @VariantID;

                INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, IDOrder, MovementDate)
                VALUES (@VariantID, 'POSITIVE_ADJUSTMENT', @SoldQty, @PrevBal, @PrevBal + @SoldQty, 'Order cancelled: stock restocked', @IDUser, @IDOrder, SYSUTCDATETIME());

                FETCH NEXT FROM CancelCursor INTO @VariantID, @SoldQty;
            END

            CLOSE CancelCursor;
            DEALLOCATE CancelCursor;

            IF @OrderCouponID IS NOT NULL
            BEGIN
                DELETE FROM dbo.CouponUsages WHERE IDOrder = @IDOrder AND IDCoupon = @OrderCouponID;
                UPDATE dbo.Coupons
                SET CurrentUses = IIF(CurrentUses > 0, CurrentUses - 1, 0)
                WHERE IDCoupon = @OrderCouponID;
            END
        END

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, PreviousValueJson, NewValueJson, LoggedAt)
        VALUES (@IDUser, 'ORDERS', 'Orders', CAST(@IDOrder AS VARCHAR(50)), 'UPDATE',
                (SELECT @CurrentStatus AS Status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                (SELECT @NewStatus AS Status FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Orders_ProcessReturn
    @IDOrder INT,
    @IDOrderItem INT,
    @QuantityToReturn INT,
    @Reason NVARCHAR(255),
    @IDOperatorUser INT,
    @NewIDReturn INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Verify Order is DELIVERED
    DECLARE @OrderStatus VARCHAR(30);
    SELECT @OrderStatus = Status FROM dbo.Orders WHERE IDOrder = @IDOrder;

    IF @OrderStatus NOT IN ('DELIVERED', 'PARTIALLY_RETURNED')
    BEGIN
        RAISERROR('RETURN_NOT_ALLOWED: Returns are only permitted for delivered orders.', 16, 1);
        RETURN;
    END

    -- Verify item and returned quantities
    DECLARE @QuantitySold INT, @CurrentReturned INT, @UnitPrice DECIMAL(12,2), @VariantID INT;
    SELECT 
        @QuantitySold = QuantitySold,
        @CurrentReturned = QuantityReturned,
        @UnitPrice = UnitPrice,
        @VariantID = IDVariant
    FROM dbo.OrderItems
    WHERE IDOrderItem = @IDOrderItem AND IDOrder = @IDOrder;

    IF @QuantitySold IS NULL
    BEGIN
        RAISERROR('ITEM_NOT_FOUND: Order item does not exist in this order.', 16, 1);
        RETURN;
    END

    IF (@CurrentReturned + @QuantityToReturn) > @QuantitySold
    BEGIN
        RAISERROR('RETURN_QUANTITY_EXCEEDED: Total returned quantity cannot exceed quantity sold.', 16, 1);
        RETURN;
    END

    DECLARE @RefundAmount DECIMAL(12,2) = CAST((@QuantityToReturn * @UnitPrice) AS DECIMAL(12,2));

    BEGIN TRANSACTION;
        -- Create Return header
        INSERT INTO dbo.Returns (IDOrder, IDOperatorUser, Reason, TotalRefundAmount, CreatedAt)
        VALUES (@IDOrder, @IDOperatorUser, @Reason, @RefundAmount, SYSUTCDATETIME());

        SET @NewIDReturn = SCOPE_IDENTITY();

        -- Create Return item
        INSERT INTO dbo.ReturnItems (IDReturn, IDOrderItem, QuantityReturned, RefundedAmount)
        VALUES (@NewIDReturn, @IDOrderItem, @QuantityToReturn, @RefundAmount);

        -- Update OrderItem returned count
        UPDATE dbo.OrderItems
        SET QuantityReturned = QuantityReturned + @QuantityToReturn
        WHERE IDOrderItem = @IDOrderItem;

        -- Reintegrate stock into Kardex
        DECLARE @PrevBal INT;
        SELECT @PrevBal = PhysicalStock FROM dbo.ProductVariants WITH (UPDLOCK) WHERE IDVariant = @VariantID;

        UPDATE dbo.ProductVariants
        SET PhysicalStock = PhysicalStock + @QuantityToReturn, UpdatedAt = SYSUTCDATETIME()
        WHERE IDVariant = @VariantID;

        INSERT INTO dbo.Kardex (IDVariant, MovementType, Quantity, PreviousBalance, NewBalance, Reason, IDUser, IDOrder, MovementDate)
        VALUES (
            @VariantID, 'CLIENT_RETURN', @QuantityToReturn, @PrevBal, @PrevBal + @QuantityToReturn,
            'Client return processed. Return #' + CAST(@NewIDReturn AS VARCHAR(10)), @IDOperatorUser, @IDOrder, SYSUTCDATETIME()
        );

        -- Update Order status: FULLY_RETURNED or PARTIALLY_RETURNED
        DECLARE @AllSold INT, @AllReturned INT;
        SELECT @AllSold = SUM(QuantitySold), @AllReturned = SUM(QuantityReturned)
        FROM dbo.OrderItems WHERE IDOrder = @IDOrder;

        DECLARE @UpdatedOrderStatus VARCHAR(30) = IIF(@AllSold = @AllReturned, 'FULLY_RETURNED', 'PARTIALLY_RETURNED');

        UPDATE dbo.Orders SET Status = @UpdatedOrderStatus, UpdatedAt = SYSUTCDATETIME() WHERE IDOrder = @IDOrder;

        INSERT INTO dbo.OrderStatusHistory (IDOrder, PreviousStatus, NewStatus, IDUser, Reason, ChangedAt)
        VALUES (@IDOrder, @OrderStatus, @UpdatedOrderStatus, @IDOperatorUser, 'Return processed: ' + @Reason, SYSUTCDATETIME());

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Orders_GetOrderByID
    @IDOrder INT,
    @RequestingUserID INT,
    @IsStaff BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    -- Security Acceptance Criteria (RF-01): Changing order ID in URL or body must not expose another client's order
    IF @IsStaff = 0 AND NOT EXISTS (SELECT 1 FROM dbo.Orders WHERE IDOrder = @IDOrder AND IDUser = @RequestingUserID)
    BEGIN
        RAISERROR('FORBIDDEN_ACCESS: You do not have permission to view this order.', 16, 1);
        RETURN;
    END

    -- Order Header
    SELECT 
        O.IDOrder,
        O.OrderNumber,
        O.IDUser,
        U.FullName AS CustomerName,
        U.Email AS CustomerEmail,
        O.IDCart,
        O.IDDeliveryAddress,
        O.ShippingAddressSnapshot,
        O.NetSubtotal,
        O.IVATaxAmount,
        O.DiscountTotal,
        O.GrandTotal,
        O.IDCoupon,
        CP.Code AS CouponCode,
        O.Status,
        O.IdempotencyKey,
        O.CreatedAt,
        O.UpdatedAt
    FROM dbo.Orders O
    JOIN dbo.Users U ON O.IDUser = U.IDUser
    LEFT JOIN dbo.Coupons CP ON O.IDCoupon = CP.IDCoupon
    WHERE O.IDOrder = @IDOrder;

    -- Order Details
    SELECT 
        OI.IDOrderItem,
        OI.IDVariant,
        OI.HistoricalSKU,
        OI.HistoricalProductName,
        OI.UnitPrice,
        OI.QuantitySold,
        OI.QuantityReturned,
        OI.LineTotal
    FROM dbo.OrderItems OI
    WHERE OI.IDOrder = @IDOrder;

    -- Status History
    SELECT 
        OSH.IDOrderStatusHistory,
        OSH.PreviousStatus,
        OSH.NewStatus,
        OSH.ChangedAt,
        OSH.Reason,
        U.FullName AS ChangedByUserName
    FROM dbo.OrderStatusHistory OSH
    JOIN dbo.Users U ON OSH.IDUser = U.IDUser
    WHERE OSH.IDOrder = @IDOrder
    ORDER BY OSH.ChangedAt ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Orders_List
    @IDUser INT = NULL,             -- If provided (client), only return that user's orders
    @Status VARCHAR(30) = NULL,      -- Filter by status (PAID, IN_PREPARATION, etc.)
    @StartDate DATETIME2(3) = NULL,  -- Filter by start date
    @EndDate DATETIME2(3) = NULL,    -- Filter by end date
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    WITH OrderList AS (
        SELECT 
            O.IDOrder,
            O.OrderNumber,
            O.IDUser,
            U.FullName AS CustomerName,
            U.Email AS CustomerEmail,
            O.NetSubtotal,
            O.IVATaxAmount,
            O.DiscountTotal,
            O.GrandTotal,
            O.Status,
            O.CreatedAt,
            O.UpdatedAt,
            (SELECT COUNT(1) FROM dbo.OrderItems OI WHERE OI.IDOrder = O.IDOrder) AS ItemCount
        FROM dbo.Orders O
        JOIN dbo.Users U ON O.IDUser = U.IDUser
        WHERE (@IDUser IS NULL OR O.IDUser = @IDUser)
          AND (@Status IS NULL OR O.Status = @Status)
          AND (@StartDate IS NULL OR O.CreatedAt >= @StartDate)
          AND (@EndDate IS NULL OR O.CreatedAt <= @EndDate)
    ),
    CountedList AS (
        SELECT COUNT(1) OVER() AS TotalRows, * FROM OrderList
    )
    SELECT * FROM CountedList
    ORDER BY CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ============================================================================
-- 7. AUDIT & SYSTEM CONFIGURATIONS MODULE (RF-08, RF-09)
-- ============================================================================

CREATE OR ALTER PROCEDURE dbo.SP_Configurations_Get
    @ConfigKey VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT IDConfiguration, ConfigKey, ConfigValue, DataType, Description, IsEditable, UpdatedAt
    FROM dbo.Configurations
    WHERE ConfigKey = @ConfigKey;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Configurations_Update
    @ConfigKey VARCHAR(50),
    @NewValue NVARCHAR(255),
    @IDUser INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PreviousValue NVARCHAR(255);
    DECLARE @IsEditable BIT;

    SELECT @PreviousValue = ConfigValue, @IsEditable = IsEditable
    FROM dbo.Configurations WHERE ConfigKey = @ConfigKey;

    IF @PreviousValue IS NULL
    BEGIN
        RAISERROR('CONFIG_NOT_FOUND: System configuration key does not exist.', 16, 1);
        RETURN;
    END

    IF @IsEditable = 0
    BEGIN
        RAISERROR('CONFIG_NOT_EDITABLE: This configuration key is locked and cannot be edited.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.Configurations
        SET ConfigValue = @NewValue, UpdatedAt = SYSUTCDATETIME(), UpdatedByUserID = @IDUser
        WHERE ConfigKey = @ConfigKey;

        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, PreviousValueJson, NewValueJson, LoggedAt)
        VALUES (@IDUser, 'CONFIG', 'Configurations', @ConfigKey, 'UPDATE',
                (SELECT @PreviousValue AS ConfigValue FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                (SELECT @NewValue AS ConfigValue FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Audit_ListLogs
    @Module VARCHAR(50) = NULL,
    @EntityName VARCHAR(50) = NULL,
    @StartDate DATETIME2(3) = NULL,
    @EndDate DATETIME2(3) = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    WITH AuditData AS (
        SELECT 
            AL.IDAuditLog,
            AL.IDUser,
            U.FullName AS UserName,
            U.Email AS UserEmail,
            AL.Module,
            AL.EntityName,
            AL.EntityID,
            AL.ActionType,
            AL.PreviousValueJson,
            AL.NewValueJson,
            AL.LoggedAt
        FROM dbo.AuditLog AL
        LEFT JOIN dbo.Users U ON AL.IDUser = U.IDUser
        WHERE (@Module IS NULL OR AL.Module = @Module)
          AND (@EntityName IS NULL OR AL.EntityName = @EntityName)
          AND (@StartDate IS NULL OR AL.LoggedAt >= @StartDate)
          AND (@EndDate IS NULL OR AL.LoggedAt <= @EndDate)
    ),
    CountedData AS (
        SELECT COUNT(1) OVER() AS TotalRows, * FROM AuditData
    )
    SELECT * FROM CountedData
    ORDER BY LoggedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ============================================================================
-- 8. ANALYTICS & DASHBOARD REPORTS (RF-08)
-- ============================================================================

CREATE OR ALTER PROCEDURE dbo.SP_Reports_GetSalesSummary
    @StartDate DATE = NULL,
    @EndDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        SalesDate,
        SalesYear,
        SalesWeek,
        SalesMonth,
        TotalOrdersCount,
        GrossSalesAmount,
        TotalRefundedAmount,
        NetSalesAmount,
        AverageOrderTicket
    FROM dbo.VW_Dashboard_SalesSummary
    WHERE (@StartDate IS NULL OR SalesDate >= @StartDate)
      AND (@EndDate IS NULL OR SalesDate <= @EndDate)
    ORDER BY SalesDate DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Reports_GetSalesByCategory
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        IDCategory,
        CategoryName,
        OrdersCount,
        NetUnitsSold,
        GrossCategorySales,
        CategoryRefundedAmount,
        NetCategorySales
    FROM dbo.VW_Dashboard_SalesByCategory
    ORDER BY NetCategorySales DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Reports_GetTopSellingProducts
    @TopN INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@TopN)
        IDProduct,
        ProductName,
        CategoryName,
        IDVariant,
        SKU,
        NetUnitsSold,
        NetProductSales
    FROM dbo.VW_Dashboard_TopSellingProducts
    ORDER BY NetUnitsSold DESC, NetProductSales DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Reports_GetAbandonedCarts
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        IDCart,
        IDUser,
        CustomerName,
        CustomerEmail,
        GuestToken,
        CreatedAt,
        LastActivityAt,
        InactiveHours,
        TotalItemsCount,
        EstimatedCartTotal
    FROM dbo.VW_Dashboard_AbandonedCarts
    ORDER BY LastActivityAt DESC;
END
GO

-- ============================================================================
-- 9. USER MANAGEMENT BY ADMINISTRATOR (RF-01)
-- ============================================================================

CREATE OR ALTER PROCEDURE dbo.SP_Users_CreateByAdmin
    @RoleCode VARCHAR(50),
    @FullName NVARCHAR(150),
    @Email VARCHAR(150),
    @PasswordHash VARCHAR(255),
    @PhoneNumber VARCHAR(30) = NULL,
    @AdminUserID INT,
    @NewIDUser INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IDRole INT;
    SELECT @IDRole = IDValue FROM dbo.ValuesLookup WHERE ValueCategory = 'USER_ROLE' AND Code = @RoleCode AND IsActive = 1;

    IF @IDRole IS NULL
    BEGIN
        RAISERROR('INVALID_ROLE: The specified user role does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
    BEGIN
        RAISERROR('EMAIL_ALREADY_EXISTS: A user with this email address is already registered.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        INSERT INTO dbo.Users (IDRole, FullName, Email, PasswordHash, PhoneNumber, IsActive, CreatedAt)
        VALUES (@IDRole, @FullName, @Email, @PasswordHash, @PhoneNumber, 1, SYSUTCDATETIME());

        SET @NewIDUser = SCOPE_IDENTITY();

        -- Audit Log entry
        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, NewValueJson, LoggedAt)
        VALUES (@AdminUserID, 'USERS', 'Users', CAST(@NewIDUser AS VARCHAR(50)), 'CREATE', 
                (SELECT @FullName AS FullName, @Email AS Email, @RoleCode AS RoleCode FOR JSON PATH, WITHOUT_ARRAY_WRAPPER), 
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Users_List
    @RoleCode VARCHAR(50) = NULL,
    @SearchQuery NVARCHAR(150) = NULL,
    @IsActive BIT = NULL,
    @Page INT = 1,
    @Limit INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @Limit;

    WITH FilteredUsers AS (
        SELECT 
            U.IDUser,
            U.IDRole,
            VL.Code AS RoleCode,
            VL.Name AS RoleName,
            U.FullName,
            U.Email,
            U.PhoneNumber,
            U.IsActive,
            U.CreatedAt,
            U.UpdatedAt
        FROM dbo.Users U
        JOIN dbo.ValuesLookup VL ON U.IDRole = VL.IDValue
        WHERE (@RoleCode IS NULL OR VL.Code = @RoleCode)
          AND (@IsActive IS NULL OR U.IsActive = @IsActive)
          AND (@SearchQuery IS NULL OR U.FullName LIKE '%' + @SearchQuery + '%' OR U.Email LIKE '%' + @SearchQuery + '%')
    ),
    CountedUsers AS (
        SELECT COUNT(1) OVER() AS TotalCount, * FROM FilteredUsers
    )
    SELECT * FROM CountedUsers
    ORDER BY CreatedAt DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Users_GetByID
    @IDUser INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        U.IDUser,
        U.IDRole,
        VL.Code AS RoleCode,
        VL.Name AS RoleName,
        U.FullName,
        U.Email,
        U.PhoneNumber,
        U.IsActive,
        U.CreatedAt,
        U.UpdatedAt
    FROM dbo.Users U
    JOIN dbo.ValuesLookup VL ON U.IDRole = VL.IDValue
    WHERE U.IDUser = @IDUser;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Users_UpdateRole
    @IDUser INT,
    @NewRoleCode VARCHAR(50),
    @AdminUserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @NewIDRole INT;
    SELECT @NewIDRole = IDValue FROM dbo.ValuesLookup WHERE ValueCategory = 'USER_ROLE' AND Code = @NewRoleCode AND IsActive = 1;

    IF @NewIDRole IS NULL
    BEGIN
        RAISERROR('INVALID_ROLE: The specified user role does not exist.', 16, 1);
        RETURN;
    END

    DECLARE @OldRoleCode VARCHAR(50);
    SELECT @OldRoleCode = VL.Code
    FROM dbo.Users U
    JOIN dbo.ValuesLookup VL ON U.IDRole = VL.IDValue
    WHERE U.IDUser = @IDUser;

    IF @OldRoleCode IS NULL
    BEGIN
        RAISERROR('USER_NOT_FOUND: User does not exist.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.Users
        SET IDRole = @NewIDRole, UpdatedAt = SYSUTCDATETIME()
        WHERE IDUser = @IDUser;

        -- Audit Log
        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, PreviousValueJson, NewValueJson, LoggedAt)
        VALUES (@AdminUserID, 'USERS', 'Users', CAST(@IDUser AS VARCHAR(50)), 'UPDATE',
                (SELECT @OldRoleCode AS RoleCode FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                (SELECT @NewRoleCode AS RoleCode FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.SP_Users_UpdateStatus
    @IDUser INT,
    @IsActive BIT,
    @Reason NVARCHAR(255) = NULL,
    @AdminUserID INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @CurrentStatus BIT;
    SELECT @CurrentStatus = IsActive FROM dbo.Users WHERE IDUser = @IDUser;

    IF @CurrentStatus IS NULL
    BEGIN
        RAISERROR('USER_NOT_FOUND: User does not exist.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;
        UPDATE dbo.Users
        SET IsActive = @IsActive, UpdatedAt = SYSUTCDATETIME()
        WHERE IDUser = @IDUser;

        -- If deactivated, revoke all active refresh tokens immediately
        IF @IsActive = 0
        BEGIN
            UPDATE dbo.RefreshTokens
            SET IsRevoked = 1
            WHERE IDUser = @IDUser AND IsRevoked = 0;
        END

        -- Audit Log
        INSERT INTO dbo.AuditLog (IDUser, Module, EntityName, EntityID, ActionType, PreviousValueJson, NewValueJson, LoggedAt)
        VALUES (@AdminUserID, 'USERS', 'Users', CAST(@IDUser AS VARCHAR(50)),
                IIF(@IsActive = 0, 'DEACTIVATE', 'UPDATE'),
                (SELECT @CurrentStatus AS IsActive FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                (SELECT @IsActive AS IsActive, @Reason AS Reason FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                SYSUTCDATETIME());
    COMMIT TRANSACTION;
END
GO
