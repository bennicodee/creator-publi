using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreatorPubli.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ConfirmacaoEmailSessoesResumo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "email_verified_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "session_version",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "last_digest_on",
                table: "reminder_settings",
                type: "date",
                nullable: true);

            // Contas que já entram com o Google têm o e-mail verificado por ele.
            migrationBuilder.Sql("UPDATE users SET email_verified_at = now() WHERE google_subject IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "email_verified_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "session_version",
                table: "users");

            migrationBuilder.DropColumn(
                name: "last_digest_on",
                table: "reminder_settings");
        }
    }
}
