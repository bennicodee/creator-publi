using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreatorPubli.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AssinaturaMercadoPago : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "checkout_url",
                table: "subscriptions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "provider_id",
                table: "subscriptions",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "subscriptions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "authorized"); // assinaturas que já existiam (simuladas) continuam ativas

            migrationBuilder.CreateIndex(
                name: "ix_subscriptions_provider_id",
                table: "subscriptions",
                column: "provider_id",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_subscriptions_status",
                table: "subscriptions",
                sql: "status IN ('pending', 'authorized', 'paused', 'cancelled')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_subscriptions_provider_id",
                table: "subscriptions");

            migrationBuilder.DropCheckConstraint(
                name: "ck_subscriptions_status",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "checkout_url",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "provider_id",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "status",
                table: "subscriptions");
        }
    }
}
