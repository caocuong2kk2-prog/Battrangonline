-- Script to migrate Product_Type to Categories and ProductTypes
SET NOCOUNT ON;

-- 1. MIGRATING TO CATEGORIES
SET IDENTITY_INSERT BatTrangOnlineDb.dbo.Categories ON;

INSERT INTO BatTrangOnlineDb.dbo.Categories (Id, Name, Slug, Description)
SELECT 
    Product_Type_ID,
    Product_Type_Name,
    -- Simple Slug Generation (Tạo slug tiếng việt không dấu cơ bản)
    LOWER(REPLACE(REPLACE(ISNULL(Product_Type_Name, 'category'), ' ', '-'), '"', '')) + '-' + CAST(Product_Type_ID AS VARCHAR),
    Product_Type_Desc
FROM BattrangOnlineVN.dbo.Product_Type
WHERE Product_Type_ID NOT IN (SELECT Id FROM BatTrangOnlineDb.dbo.Categories);

SET IDENTITY_INSERT BatTrangOnlineDb.dbo.Categories OFF;

-- 2. MIGRATING TO PRODUCT TYPES (if needed for Variants)
SET IDENTITY_INSERT BatTrangOnlineDb.dbo.ProductTypes ON;

INSERT INTO BatTrangOnlineDb.dbo.ProductTypes (Id, Name, Description)
SELECT 
    Product_Type_ID,
    Product_Type_Name,
    Product_Type_Desc
FROM BattrangOnlineVN.dbo.Product_Type
WHERE Product_Type_ID NOT IN (SELECT Id FROM BatTrangOnlineDb.dbo.ProductTypes);

SET IDENTITY_INSERT BatTrangOnlineDb.dbo.ProductTypes OFF;

PRINT 'Hoàn thành việc nạp dữ liệu Product_Type sang Categories và ProductTypes!';
