using CreatorPubli.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CreatorPubli.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<ReminderSettings> ReminderSettings => Set<ReminderSettings>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<Deliverable> Deliverables => Set<Deliverable>();
    public DbSet<ChecklistItem> ChecklistItems => Set<ChecklistItem>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        // Enums gravados como texto com o mesmo id do frontend ("producao", "reels"...).
        b.Properties<CampaignStatus>().HaveConversion<LowercaseEnumConverter<CampaignStatus>>().HaveMaxLength(20);
        b.Properties<PaymentMethod>().HaveConversion<LowercaseEnumConverter<PaymentMethod>>().HaveMaxLength(20);
        b.Properties<DeliverableType>().HaveConversion<LowercaseEnumConverter<DeliverableType>>().HaveMaxLength(20);
        b.Properties<InvoiceStatus>().HaveConversion<LowercaseEnumConverter<InvoiceStatus>>().HaveMaxLength(20);
        b.Properties<Network>().HaveConversion<LowercaseEnumConverter<Network>>().HaveMaxLength(20);
        b.Properties<decimal>().HavePrecision(12, 2);
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => u.GoogleSubject).IsUnique();
            e.Property(u => u.Name).HasMaxLength(120);
            e.Property(u => u.Email).HasMaxLength(254);
            e.HasOne(u => u.Profile).WithOne().HasForeignKey<Profile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(u => u.Settings).WithOne().HasForeignKey<ReminderSettings>(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(u => u.Subscriptions).WithOne().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(u => u.Campaigns).WithOne().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Profile>(e =>
        {
            e.HasKey(p => p.UserId);
            e.HasIndex(p => p.PublicSlug).IsUnique();
            e.Property(p => p.PublicSlug).HasMaxLength(60);
            e.Property(p => p.AudienceFemale).HasPrecision(5, 2);
            e.Property(p => p.DefaultIssRate).HasPrecision(5, 2);
            e.OwnsMany(p => p.Networks, n =>
            {
                n.ToTable("social_accounts", t => t.HasCheckConstraint("ck_social_accounts_network", InList<Network>("network")));
                n.WithOwner().HasForeignKey("UserId");
                n.HasKey("UserId", nameof(SocialAccount.Network));
                n.Property(a => a.Engagement).HasPrecision(5, 2);
            });
        });

        b.Entity<ReminderSettings>().HasKey(s => s.UserId);

        b.Entity<Subscription>(e =>
        {
            // No máximo uma assinatura ativa por usuário.
            e.HasIndex(s => s.UserId).IsUnique().HasFilter("canceled_at IS NULL");
            e.Property(s => s.MonthlyPrice).HasPrecision(10, 2);
        });

        b.Entity<Campaign>(e =>
        {
            e.ToTable(t =>
            {
                t.HasCheckConstraint("ck_campaigns_status", InList<CampaignStatus>("status"));
                t.HasCheckConstraint("ck_campaigns_payment_method", InList<PaymentMethod>("payment_method"));
                t.HasCheckConstraint("ck_campaigns_value", "value >= 0");
            });
            e.HasIndex(c => new { c.UserId, c.Status });
            e.Property(c => c.Brand).HasMaxLength(120);
            e.HasMany(c => c.Deliverables).WithOne().HasForeignKey(d => d.CampaignId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(c => c.Checklist).WithOne().HasForeignKey(i => i.CampaignId).OnDelete(DeleteBehavior.Cascade);
            e.OwnsOne(c => c.Invoice, i =>
            {
                i.ToTable("invoices", t => t.HasCheckConstraint("ck_invoices_status", InList<InvoiceStatus>("status")));
                i.WithOwner().HasForeignKey("CampaignId");
                i.HasKey("CampaignId");
                i.Property<Guid>("CampaignId").HasColumnName("campaign_id");
                i.Property(x => x.IssRate).HasPrecision(5, 2);
            });
            e.Navigation(c => c.Invoice).AutoInclude();
        });

        b.Entity<Deliverable>(e =>
        {
            e.ToTable(t =>
            {
                t.HasCheckConstraint("ck_deliverables_type", InList<DeliverableType>("type"));
                t.HasCheckConstraint("ck_deliverables_quantity", "quantity > 0");
            });
            e.HasIndex(d => new { d.CampaignId, d.Position });
            e.OwnsOne(d => d.Metrics, m =>
            {
                m.ToTable("post_metrics");
                m.WithOwner().HasForeignKey("DeliverableId");
                m.HasKey("DeliverableId");
                m.Property<Guid>("DeliverableId").HasColumnName("deliverable_id");
            });
        });

        b.Entity<ChecklistItem>().HasIndex(i => new { i.CampaignId, i.Position });
    }

    // Ex.: status IN ('proposta', 'negociando', ...)
    static string InList<T>(string column) where T : struct, Enum =>
        $"{column} IN ({string.Join(", ", Enum.GetNames<T>().Select(n => $"'{n.ToLowerInvariant()}'"))})";
}

public class LowercaseEnumConverter<T>() : ValueConverter<T, string>(
    v => v.ToString().ToLowerInvariant(),
    v => Enum.Parse<T>(v, true)) where T : struct, Enum;
