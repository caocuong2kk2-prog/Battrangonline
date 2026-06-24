using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductSku : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Sku",
                table: "Products",
                type: "nvarchar(100)",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE p
                SET p.Sku = CASE 
                    WHEN c.Slug = 'loc-binh' THEN 'LB-' + RIGHT('000' + CAST(p.Id AS VARCHAR), 3)
                    WHEN c.Slug = 'do-tho' THEN 'DT-' + RIGHT('000' + CAST(p.Id AS VARCHAR), 3)
                    WHEN c.Slug = 'tranh-gom' THEN 'TG-' + RIGHT('000' + CAST(p.Id AS VARCHAR), 3)
                    WHEN c.Slug = 'binh-hoa' THEN 'BH-' + RIGHT('000' + CAST(p.Id AS VARCHAR), 3)
                    WHEN c.Slug = 'chum-vat' THEN 'CV-' + RIGHT('000' + CAST(p.Id AS VARCHAR), 3)
                    WHEN c.Slug = 'dia-gom' THEN 'DG-' + RIGHT('000' + CAST(p.Id AS VARCHAR), 3)
                    ELSE 'SP-' + RIGHT('000' + CAST(p.Id AS VARCHAR), 3)
                END
                FROM Products p
                INNER JOIN Categories c ON p.CategoryId = c.Id
                WHERE p.Sku IS NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Sku",
                table: "Products");
        }
    }
}
