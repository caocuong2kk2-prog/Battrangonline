using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BatTrang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAffiliateResetPassword : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastResetSentAt",
                table: "Affiliates",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ResetAttempts",
                table: "Affiliates",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ResetToken",
                table: "Affiliates",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ResetTokenExpiresAt",
                table: "Affiliates",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastResetSentAt",
                table: "Affiliates");

            migrationBuilder.DropColumn(
                name: "ResetAttempts",
                table: "Affiliates");

            migrationBuilder.DropColumn(
                name: "ResetToken",
                table: "Affiliates");

            migrationBuilder.DropColumn(
                name: "ResetTokenExpiresAt",
                table: "Affiliates");
        }
    }
}
