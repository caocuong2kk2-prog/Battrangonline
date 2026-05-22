using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAdminUserSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PasswordHash",
                table: "AdminUsers",
                newName: "Password");

            migrationBuilder.RenameColumn(
                name: "Email",
                table: "AdminUsers",
                newName: "Username");

            migrationBuilder.RenameIndex(
                name: "IX_AdminUsers_Email",
                table: "AdminUsers",
                newName: "IX_AdminUsers_Username");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Username",
                table: "AdminUsers",
                newName: "Email");

            migrationBuilder.RenameColumn(
                name: "Password",
                table: "AdminUsers",
                newName: "PasswordHash");

            migrationBuilder.RenameIndex(
                name: "IX_AdminUsers_Username",
                table: "AdminUsers",
                newName: "IX_AdminUsers_Email");
        }
    }
}
