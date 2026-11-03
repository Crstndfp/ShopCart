-- ============================================================================
-- Script 03: Table-Valued Functions (FU_Module_Process)
-- Project: ShopCart (Tech Challenge 360 - Grupo Pentandra)
-- DBMS: Microsoft SQL Server 2019+
-- Standards: FU_Module_Process, Inline Table-Valued Functions for High Performance
-- ============================================================================

USE ShopCartDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. FU_Catalog_AvailableStock
-- Returns physical stock, active unexpired reservations, and available stock
-- AvailableStock = PhysicalStock - ActiveUnexpiredReservations
-- ============================================================================
CREATE OR ALTER FUNCTION dbo.FU_Catalog_AvailableStock (
    @IDVariant INT
)
RETURNS TABLE
AS
RETURN (
    WITH ActiveReservations AS (
        SELECT ISNULL(SUM(Quantity), 0) AS ReservedQuantity
        FROM dbo.StockReservations
        WHERE IDVariant = @IDVariant
          AND Status = 'ACTIVE'
          AND ExpiresAt > SYSUTCDATETIME()
    )
    SELECT 
        PV.IDVariant,
        PV.SKU,
        PV.PhysicalStock,
        AR.ReservedQuantity,
        IIF((PV.PhysicalStock - AR.ReservedQuantity) > 0, (PV.PhysicalStock - AR.ReservedQuantity), 0) AS AvailableStock
    FROM dbo.ProductVariants PV
    CROSS JOIN ActiveReservations AR
    WHERE PV.IDVariant = @IDVariant
);
GO

-- ============================================================================
-- 2. FU_Orders_CalculateTaxes
-- Computes exact 12% IVA breakdown from Gross Total (IVA included)
-- Base Imponible (Net Subtotal) = Total / 1.12
-- IVA Tax Amount = Total - Base Imponible
-- ============================================================================
CREATE OR ALTER FUNCTION dbo.FU_Orders_CalculateTaxes (
    @GrossTotal DECIMAL(12,2)
)
RETURNS TABLE
AS
RETURN (
    SELECT 
        @GrossTotal AS GrossTotal,
        CAST(ROUND(@GrossTotal / 1.12, 2) AS DECIMAL(12,2)) AS NetSubtotal,
        CAST(@GrossTotal - ROUND(@GrossTotal / 1.12, 2) AS DECIMAL(12,2)) AS IVATaxAmount
);
GO

-- ============================================================================
-- 3. FU_Coupons_CalculateDiscount
-- Evaluates coupon validity, date, min amount, usage limits, and calculates discount
-- ============================================================================
CREATE OR ALTER FUNCTION dbo.FU_Coupons_CalculateDiscount (
    @CouponCode VARCHAR(50),
    @IDUser INT,
    @EligibleSubtotal DECIMAL(12,2)
)
RETURNS TABLE
AS
RETURN (
    WITH CouponData AS (
        SELECT 
            C.IDCoupon,
            C.Code,
            C.DiscountType,
            C.DiscountValue,
            C.MinPurchaseAmount,
            C.StartDate,
            C.EndDate,
            C.MaxTotalUses,
            C.CurrentUses,
            C.MaxUsesPerClient,
            C.IDCategory,
            C.IsActive,
            (SELECT COUNT(1) FROM dbo.CouponUsages CU WHERE CU.IDCoupon = C.IDCoupon AND CU.IDUser = @IDUser) AS ClientUsesCount
        FROM dbo.Coupons C
        WHERE C.Code = @CouponCode
    )
    SELECT 
        CD.IDCoupon,
        ISNULL(CD.Code, R.RequestedCode) AS Code,
        IIF(CD.IDCoupon IS NULL, 'COUPON_NOT_FOUND',
            IIF(CD.IsActive = 0, 'COUPON_INACTIVE',
                IIF(SYSUTCDATETIME() < CD.StartDate, 'COUPON_NOT_YET_VALID',
                    IIF(SYSUTCDATETIME() > CD.EndDate, 'COUPON_EXPIRED',
                        IIF(CD.CurrentUses >= CD.MaxTotalUses, 'COUPON_EXHAUSTED',
                            IIF(CD.ClientUsesCount >= CD.MaxUsesPerClient, 'COUPON_MAX_CLIENT_USES_REACHED',
                                IIF(@EligibleSubtotal < CD.MinPurchaseAmount, 'COUPON_MIN_PURCHASE_NOT_MET', 'VALID')
                            )
                        )
                    )
                )
            )
        ) AS ValidationStatus,
        CAST(
            IIF(
                CD.IDCoupon IS NOT NULL 
                AND CD.IsActive = 1 
                AND SYSUTCDATETIME() BETWEEN CD.StartDate AND CD.EndDate
                AND CD.CurrentUses < CD.MaxTotalUses
                AND CD.ClientUsesCount < CD.MaxUsesPerClient
                AND @EligibleSubtotal >= CD.MinPurchaseAmount,
                IIF(CD.DiscountType = 'PERCENTAGE',
                    ROUND((@EligibleSubtotal * (CD.DiscountValue / 100.0)), 2),
                    IIF(CD.DiscountType = 'FIXED_AMOUNT',
                        IIF(CD.DiscountValue > @EligibleSubtotal, @EligibleSubtotal, CD.DiscountValue),
                        0.00
                    )
                ),
                0.00
            ) AS DECIMAL(12,2)
        ) AS CalculatedDiscount
    FROM (SELECT @CouponCode AS RequestedCode) R
    LEFT JOIN CouponData CD ON 1 = 1
);
GO
