using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameBrandToGlazeLine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Brand",
                table: "Products",
                newName: "GlazeLine");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "GlazeLine",
                table: "Products",
                newName: "Brand");
        }
    }
}
