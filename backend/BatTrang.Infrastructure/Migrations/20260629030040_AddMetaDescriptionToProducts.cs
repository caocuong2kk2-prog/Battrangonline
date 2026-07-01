using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMetaDescriptionToProducts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MetaDescription",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MetaDescription",
                table: "Products");
        }
    }
}
