SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

DECLARE @OldProductId INT, @ProductTypeId INT, @Name NVARCHAR(MAX), @MainImage NVARCHAR(MAX), @Quantity INT, @MediaXml XML;
DECLARE @NewProductId INT, @NewVariantId INT;

-- Use cursor to iterate through the joined result of old and new products
DECLARE fix_cursor CURSOR FOR 
SELECT 
    p.Id AS NewProductId,
    op.product_id AS OldProductId,
    op.product_type_id AS ProductTypeId,
    op.Product_Name AS Name,
    op.product_image AS MainImage,
    op.product_quantity AS Quantity,
    CAST(op.media AS XML) AS MediaXml
FROM BatTrangOnlineDb.dbo.Products p
JOIN BattrangOnlineVN.dbo.Products op ON p.Name = op.Product_Name;

OPEN fix_cursor;
FETCH NEXT FROM fix_cursor INTO @NewProductId, @OldProductId, @ProductTypeId, @Name, @MainImage, @Quantity, @MediaXml;

WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        -- 1. FIX CATEGORY ID & STATUS IN PRODUCTS
        UPDATE BatTrangOnlineDb.dbo.Products
        SET 
            CategoryId = CASE 
                WHEN @ProductTypeId IS NOT NULL AND EXISTS(SELECT 1 FROM BatTrangOnlineDb.dbo.Categories WHERE Id = @ProductTypeId) 
                THEN @ProductTypeId 
                ELSE CategoryId -- Giữ nguyên nếu không tìm thấy
            END,
            Status = CASE WHEN ISNULL(@Quantity, 0) = 0 THEN 'inactive' ELSE 'active' END
        WHERE Id = @NewProductId;

        -- 2. FIX PRODUCT VARIANTS (STOCK & PRICE if needed, we'll just fix stock and make sure variant exists)
        -- Cố gắng lấy VariantId hiện tại. Nếu chưa có thì Insert 1 cái mặc định
        SELECT TOP 1 @NewVariantId = Id FROM BatTrangOnlineDb.dbo.ProductVariants WHERE ProductId = @NewProductId;
        
        IF @NewVariantId IS NOT NULL
        BEGIN
            UPDATE BatTrangOnlineDb.dbo.ProductVariants
            SET Stock = ISNULL(@Quantity, 0)
            WHERE Id = @NewVariantId;
        END
        ELSE
        BEGIN
            INSERT INTO BatTrangOnlineDb.dbo.ProductVariants (ProductId, Price, Stock)
            VALUES (@NewProductId, 0, ISNULL(@Quantity, 0));
            
            SET @NewVariantId = SCOPE_IDENTITY();
        END

        -- 3. FIX IMAGES
        -- Xóa ảnh cũ đi để thêm lại cho đúng chuẩn
        DELETE FROM BatTrangOnlineDb.dbo.ProductImages WHERE VariantId = @NewVariantId;
        
        DECLARE @ImgSortOrder INT = 0;
            
        -- Thêm ảnh đại diện
        IF @MainImage IS NOT NULL AND LTRIM(RTRIM(@MainImage)) <> ''
        BEGIN
            IF LEFT(@MainImage, 4) <> 'http'
                SET @MainImage = 'https://battrangonline.vn' + CASE WHEN LEFT(@MainImage, 1) = '/' THEN '' ELSE '/' END + @MainImage;
                
            INSERT INTO BatTrangOnlineDb.dbo.ProductImages (VariantId, ImageUrl, SortOrder)
            VALUES (@NewVariantId, @MainImage, @ImgSortOrder);
            
            SET @ImgSortOrder = @ImgSortOrder + 1;
        END

        -- Thêm ảnh từ XML
        IF @MediaXml IS NOT NULL
        BEGIN
            DECLARE @XmlUrl NVARCHAR(MAX);
            
            DECLARE xml_cursor CURSOR FOR 
            SELECT T.c.value('(url/text())[1]', 'NVARCHAR(MAX)') AS ImgUrl
            FROM @MediaXml.nodes('/Items/Item') AS T(c); 
            
            OPEN xml_cursor;
            FETCH NEXT FROM xml_cursor INTO @XmlUrl;
            
            WHILE @@FETCH_STATUS = 0
            BEGIN
                IF @XmlUrl IS NOT NULL AND LTRIM(RTRIM(@XmlUrl)) <> ''
                BEGIN
                    IF LEFT(@XmlUrl, 4) <> 'http'
                        SET @XmlUrl = 'https://battrangonline.vn' + CASE WHEN LEFT(@XmlUrl, 1) = '/' THEN '' ELSE '/' END + @XmlUrl;
                    
                    IF @MainImage IS NULL OR @XmlUrl <> @MainImage
                    BEGIN
                        INSERT INTO BatTrangOnlineDb.dbo.ProductImages (VariantId, ImageUrl, SortOrder)
                        VALUES (@NewVariantId, @XmlUrl, @ImgSortOrder);
                        
                        SET @ImgSortOrder = @ImgSortOrder + 1;
                    END
                END
                FETCH NEXT FROM xml_cursor INTO @XmlUrl;
            END
            CLOSE xml_cursor;
            DEALLOCATE xml_cursor;
        END

    END TRY
    BEGIN CATCH
        PRINT 'Lỗi ở ProductId mới: ' + CAST(@NewProductId AS VARCHAR) + ' - Lỗi: ' + ERROR_MESSAGE();
    END CATCH

    FETCH NEXT FROM fix_cursor INTO @NewProductId, @OldProductId, @ProductTypeId, @Name, @MainImage, @Quantity, @MediaXml;
END

CLOSE fix_cursor;
DEALLOCATE fix_cursor;
PRINT 'Hoàn thành việc cập nhật ảnh, categoryId và số lượng tồn kho!';
