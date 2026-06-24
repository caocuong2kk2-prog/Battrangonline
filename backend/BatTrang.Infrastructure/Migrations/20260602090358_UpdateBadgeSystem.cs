using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateBadgeSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Badge",
                table: "Products",
                newName: "MarketingBadges");

            migrationBuilder.AddColumn<bool>(
                name: "IsUnique",
                table: "Products",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsUnique",
                table: "Products");

            migrationBuilder.RenameColumn(
                name: "MarketingBadges",
                table: "Products",
                newName: "Badge");
        }
    }
}
