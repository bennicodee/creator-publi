using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CreatorPubli.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InicialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: true),
                    google_subject = table.Column<string>(type: "text", nullable: true),
                    picture_url = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "campaigns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    brand = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    agency = table.Column<string>(type: "text", nullable: false),
                    contact_name = table.Column<string>(type: "text", nullable: false),
                    contact_email = table.Column<string>(type: "text", nullable: false),
                    contact_phone = table.Column<string>(type: "text", nullable: false),
                    value = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    payment_method = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    payment_due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    paid_at = table.Column<DateOnly>(type: "date", nullable: true),
                    closed_at = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    briefing = table.Column<string>(type: "text", nullable: false),
                    briefing_link = table.Column<string>(type: "text", nullable: false),
                    coupon_code = table.Column<string>(type: "text", nullable: false),
                    coupon_discount = table.Column<string>(type: "text", nullable: false),
                    coupon_link = table.Column<string>(type: "text", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: false),
                    script = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateOnly>(type: "date", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_campaigns", x => x.id);
                    table.CheckConstraint("ck_campaigns_payment_method", "payment_method IN ('pix', 'transferencia', 'boleto', 'cartao', 'permuta', 'outro')");
                    table.CheckConstraint("ck_campaigns_status", "status IN ('proposta', 'negociando', 'fechada', 'producao', 'aprovacao', 'postada', 'paga')");
                    table.CheckConstraint("ck_campaigns_value", "value >= 0");
                    table.ForeignKey(
                        name: "fk_campaigns_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "profiles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    bio = table.Column<string>(type: "text", nullable: false),
                    niche = table.Column<string>(type: "text", nullable: false),
                    city = table.Column<string>(type: "text", nullable: false),
                    contact_email = table.Column<string>(type: "text", nullable: false),
                    contact_phone = table.Column<string>(type: "text", nullable: false),
                    photo_url = table.Column<string>(type: "text", nullable: false),
                    public_slug = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    audience_female = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    audience_age = table.Column<string>(type: "text", nullable: false),
                    audience_cities = table.Column<string>(type: "text", nullable: false),
                    price_reels = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    price_stories = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    price_tiktok = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    show_cases = table.Column<bool>(type: "boolean", nullable: false),
                    cnpj = table.Column<string>(type: "text", nullable: false),
                    legal_name = table.Column<string>(type: "text", nullable: false),
                    municipality = table.Column<string>(type: "text", nullable: false),
                    default_iss_rate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_profiles", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reminder_settings",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    whatsapp = table.Column<string>(type: "text", nullable: false),
                    whatsapp_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    notify_script = table.Column<bool>(type: "boolean", nullable: false),
                    notify_approval = table.Column<bool>(type: "boolean", nullable: false),
                    notify_post = table.Column<bool>(type: "boolean", nullable: false),
                    notify_payment = table.Column<bool>(type: "boolean", nullable: false),
                    days_before = table.Column<int>(type: "integer", nullable: false),
                    digest_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reminder_settings", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_reminder_settings_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "subscriptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    started_at = table.Column<DateOnly>(type: "date", nullable: false),
                    canceled_at = table.Column<DateOnly>(type: "date", nullable: true),
                    monthly_price = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_subscriptions", x => x.id);
                    table.ForeignKey(
                        name: "fk_subscriptions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "checklist_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    text = table.Column<string>(type: "text", nullable: false),
                    done = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_checklist_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_checklist_items_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "deliverables",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    script_due = table.Column<DateOnly>(type: "date", nullable: true),
                    approval_due = table.Column<DateOnly>(type: "date", nullable: true),
                    post_date = table.Column<DateOnly>(type: "date", nullable: true),
                    script_sent = table.Column<bool>(type: "boolean", nullable: false),
                    approved = table.Column<bool>(type: "boolean", nullable: false),
                    posted = table.Column<bool>(type: "boolean", nullable: false),
                    post_url = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_deliverables", x => x.id);
                    table.CheckConstraint("ck_deliverables_quantity", "quantity > 0");
                    table.CheckConstraint("ck_deliverables_type", "type IN ('reels', 'stories', 'feed', 'carrossel', 'tiktok', 'youtube', 'outro')");
                    table.ForeignKey(
                        name: "fk_deliverables_campaigns_campaign_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "invoices",
                columns: table => new
                {
                    campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    number = table.Column<string>(type: "text", nullable: false),
                    issued_at = table.Column<DateOnly>(type: "date", nullable: true),
                    taker_name = table.Column<string>(type: "text", nullable: false),
                    taker_doc = table.Column<string>(type: "text", nullable: false),
                    taker_email = table.Column<string>(type: "text", nullable: false),
                    taker_address = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    iss_rate = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_invoices", x => x.campaign_id);
                    table.CheckConstraint("ck_invoices_status", "status IN ('rascunho', 'emitida')");
                    table.ForeignKey(
                        name: "fk_invoices_campaigns_id",
                        column: x => x.campaign_id,
                        principalTable: "campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "social_accounts",
                columns: table => new
                {
                    network = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    handle = table.Column<string>(type: "text", nullable: false),
                    followers = table.Column<int>(type: "integer", nullable: false),
                    engagement = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_social_accounts", x => new { x.user_id, x.network });
                    table.CheckConstraint("ck_social_accounts_network", "network IN ('instagram', 'tiktok', 'youtube')");
                    table.ForeignKey(
                        name: "fk_social_accounts_profiles_user_id",
                        column: x => x.user_id,
                        principalTable: "profiles",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "post_metrics",
                columns: table => new
                {
                    deliverable_id = table.Column<Guid>(type: "uuid", nullable: false),
                    views = table.Column<long>(type: "bigint", nullable: false),
                    likes = table.Column<long>(type: "bigint", nullable: false),
                    comments = table.Column<long>(type: "bigint", nullable: false),
                    shares = table.Column<long>(type: "bigint", nullable: false),
                    saves = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_post_metrics", x => x.deliverable_id);
                    table.ForeignKey(
                        name: "fk_post_metrics_deliverables_id",
                        column: x => x.deliverable_id,
                        principalTable: "deliverables",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_campaigns_user_id_status",
                table: "campaigns",
                columns: new[] { "user_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_checklist_items_campaign_id_position",
                table: "checklist_items",
                columns: new[] { "campaign_id", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_deliverables_campaign_id_position",
                table: "deliverables",
                columns: new[] { "campaign_id", "position" });

            migrationBuilder.CreateIndex(
                name: "ix_profiles_public_slug",
                table: "profiles",
                column: "public_slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_subscriptions_user_id",
                table: "subscriptions",
                column: "user_id",
                unique: true,
                filter: "canceled_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_google_subject",
                table: "users",
                column: "google_subject",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "checklist_items");

            migrationBuilder.DropTable(
                name: "invoices");

            migrationBuilder.DropTable(
                name: "post_metrics");

            migrationBuilder.DropTable(
                name: "reminder_settings");

            migrationBuilder.DropTable(
                name: "social_accounts");

            migrationBuilder.DropTable(
                name: "subscriptions");

            migrationBuilder.DropTable(
                name: "deliverables");

            migrationBuilder.DropTable(
                name: "profiles");

            migrationBuilder.DropTable(
                name: "campaigns");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
