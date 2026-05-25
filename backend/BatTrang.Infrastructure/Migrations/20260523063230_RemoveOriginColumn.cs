using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveOriginColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Origin",
                table: "Products");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Origin",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
