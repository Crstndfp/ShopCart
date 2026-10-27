-- ============================================================================
-- Script 02: Views (VW_Module_Process)
-- Project: ShopCart (Tech Challenge 360 - Grupo Pentandra)
-- DBMS: Microsoft SQL Server 2019+
-- Standards: VW_Module_Process, Strict Net Calculations, Exclude Cancelled
-- ============================================================================

USE ShopCartDB;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- 1. VW_Dashboard_SalesSummary
-- Sales aggregated by completed orders, factoring in returns
-- ============================================================================
CREATE OR ALTER VIEW dbo.VW_Dashboard_SalesSummary
AS
SELECT 
    CAST(O.CreatedAt AS DATE) AS SalesDate,
    DATEPART(YEAR, O.CreatedAt) AS SalesYear,
    DATEPART(ISO_WEEK, O.CreatedAt) AS SalesWeek,
    DATEPART(MONTH, O.CreatedAt) AS SalesMonth,
    COUNT(DISTINCT O.IDOrder) AS TotalOrdersCount,
    SUM(O.GrandTotal) AS GrossSalesAmount,
    ISNULL(SUM(R.TotalRefundAmount), 0.00) AS TotalRefundedAmount,
    SUM(O.GrandTotal) - ISNULL(SUM(R.TotalRefundAmount), 0.00) AS NetSalesAmount,
    AVG(O.GrandTotal) AS AverageOrderTicket
FROM dbo.Orders O
LEFT JOIN (
    SELECT IDOrder, SUM(TotalRefundAmount) AS TotalRefundAmount
    FROM dbo.Returns
    GROUP BY IDOrder
) R ON O.IDOrder = R.IDOrder
WHERE O.Status IN ('PAID', 'IN_PREPARATION', 'DISPATCHED', 'DELIVERED', 'PARTIALLY_RETURNED')
GROUP BY 
    CAST(O.CreatedAt AS DATE),
    DATEPART(YEAR, O.CreatedAt),
    DATEPART(ISO_WEEK, O.CreatedAt),
    DATEPART(MONTH, O.CreatedAt);
GO

-- ============================================================================
-- 2. VW_Dashboard_SalesByCategory
-- Sales by product category excluding cancelled orders and deducting returns
-- ============================================================================
CREATE OR ALTER VIEW dbo.VW_Dashboard_SalesByCategory
AS
SELECT 
    C.IDCategory,
    C.Name AS CategoryName,
    COUNT(DISTINCT O.IDOrder) AS OrdersCount,
    SUM(OI.QuantitySold - OI.QuantityReturned) AS NetUnitsSold,
    SUM(OI.LineTotal) AS GrossCategorySales,
    ISNULL(SUM(RI.RefundedAmount), 0.00) AS CategoryRefundedAmount,
    SUM(OI.LineTotal) - ISNULL(SUM(RI.RefundedAmount), 0.00) AS NetCategorySales
FROM dbo.Categories C
JOIN dbo.Products P ON C.IDCategory = P.IDCategory
JOIN dbo.ProductVariants PV ON P.IDProduct = PV.IDProduct
JOIN dbo.OrderItems OI ON PV.IDVariant = OI.IDVariant
JOIN dbo.Orders O ON OI.IDOrder = O.IDOrder
LEFT JOIN dbo.Returns R ON O.IDOrder = R.IDOrder
LEFT JOIN dbo.ReturnItems RI ON R.IDReturn = RI.IDReturn AND OI.IDOrderItem = RI.IDOrderItem
WHERE O.Status IN ('PAID', 'IN_PREPARATION', 'DISPATCHED', 'DELIVERED', 'PARTIALLY_RETURNED')
GROUP BY C.IDCategory, C.Name;
GO

-- ============================================================================
-- 3. VW_Dashboard_TopSellingProducts
-- Products ranked by units sold and net sales amount
-- ============================================================================
CREATE OR ALTER VIEW dbo.VW_Dashboard_TopSellingProducts
AS
SELECT 
    P.IDProduct,
    P.Name AS ProductName,
    C.Name AS CategoryName,
    PV.IDVariant,
    PV.SKU,
    SUM(OI.QuantitySold - OI.QuantityReturned) AS NetUnitsSold,
    SUM(OI.LineTotal) - ISNULL(SUM(RI.RefundedAmount), 0.00) AS NetProductSales
FROM dbo.Products P
JOIN dbo.Categories C ON P.IDCategory = C.IDCategory
JOIN dbo.ProductVariants PV ON P.IDProduct = PV.IDProduct
JOIN dbo.OrderItems OI ON PV.IDVariant = OI.IDVariant
JOIN dbo.Orders O ON OI.IDOrder = O.IDOrder
LEFT JOIN dbo.Returns R ON O.IDOrder = R.IDOrder
LEFT JOIN dbo.ReturnItems RI ON R.IDReturn = RI.IDReturn AND OI.IDOrderItem = RI.IDOrderItem
WHERE O.Status IN ('PAID', 'IN_PREPARATION', 'DISPATCHED', 'DELIVERED', 'PARTIALLY_RETURNED')
GROUP BY P.IDProduct, P.Name, C.Name, PV.IDVariant, PV.SKU;
GO

-- ============================================================================
-- 4. VW_Orders_Summary
-- Unified view for order listings with customer information and refund status
-- ============================================================================
CREATE OR ALTER VIEW dbo.VW_Orders_Summary
AS
SELECT 
    O.IDOrder,
    O.OrderNumber,
    O.IDUser,
    U.FullName AS CustomerName,
    U.Email AS CustomerEmail,
    O.Status,
    O.NetSubtotal,
    O.IVATaxAmount,
    O.DiscountTotal,
    O.GrandTotal,
    O.IDCoupon,
    CP.Code AS CouponCode,
    ISNULL(R.TotalRefundAmount, 0.00) AS TotalRefundedAmount,
    O.GrandTotal - ISNULL(R.TotalRefundAmount, 0.00) AS EffectiveTotal,
    O.CreatedAt,
    O.UpdatedAt
FROM dbo.Orders O
JOIN dbo.Users U ON O.IDUser = U.IDUser
LEFT JOIN dbo.Coupons CP ON O.IDCoupon = CP.IDCoupon
LEFT JOIN (
    SELECT IDOrder, SUM(TotalRefundAmount) AS TotalRefundAmount
    FROM dbo.Returns
    GROUP BY IDOrder
) R ON O.IDOrder = R.IDOrder;
GO

-- ============================================================================
-- 5. VW_Dashboard_AbandonedCarts
-- Carts with items that have had no activity beyond the configured hours threshold
-- ============================================================================
CREATE OR ALTER VIEW dbo.VW_Dashboard_AbandonedCarts
AS
SELECT 
    C.IDCart,
    C.IDUser,
    U.FullName AS CustomerName,
    U.Email AS CustomerEmail,
    C.GuestToken,
    C.CreatedAt,
    C.LastActivityAt,
    DATEDIFF(HOUR, C.LastActivityAt, SYSUTCDATETIME()) AS InactiveHours,
    COUNT(CI.IDCartItem) AS TotalItemsCount,
    SUM(CI.Quantity * PV.Price) AS EstimatedCartTotal
FROM dbo.Carts C
LEFT JOIN dbo.Users U ON C.IDUser = U.IDUser
JOIN dbo.CartItems CI ON C.IDCart = CI.IDCart
JOIN dbo.ProductVariants PV ON CI.IDVariant = PV.IDVariant
WHERE C.IsActive = 1
  AND C.Status = 'ACTIVE'
  AND DATEDIFF(HOUR, C.LastActivityAt, SYSUTCDATETIME()) >= (
      SELECT ISNULL(TRY_CAST(ConfigValue AS INT), 24)
      FROM dbo.Configurations
      WHERE ConfigKey = 'CART_ABANDONED_HOURS'
  )
GROUP BY 
    C.IDCart,
    C.IDUser,
    U.FullName,
    U.Email,
    C.GuestToken,
    C.CreatedAt,
    C.LastActivityAt;
GO
