using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGlazeLineEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GlazeLine",
                table: "Products");

            migrationBuilder.AddColumn<int>(
                name: "GlazeLineId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GlazeLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlazeLines", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Products_GlazeLineId",
                table: "Products",
                column: "GlazeLineId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_GlazeLines_GlazeLineId",
                table: "Products",
                column: "GlazeLineId",
                principalTable: "GlazeLines",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_GlazeLines_GlazeLineId",
                table: "Products");

            migrationBuilder.DropTable(
                name: "GlazeLines");

            migrationBuilder.DropIndex(
                name: "IX_Products_GlazeLineId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "GlazeLineId",
                table: "Products");

            migrationBuilder.AddColumn<string>(
                name: "GlazeLine",
                table: "Products",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
