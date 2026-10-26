using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreatorPubli.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemoverContatoDaCampanha : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "contact_name",
                table: "campaigns");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "contact_name",
                table: "campaigns",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
