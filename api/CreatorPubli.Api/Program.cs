using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using CreatorPubli.Api.Email;
using CreatorPubli.Api.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddDbContext<AppDbContext>(o => o
    .UseNpgsql(config.GetConnectionString("Default"))
    .UseSnakeCaseNamingConvention());

// Enums no JSON com os mesmos ids do frontend ("producao", "reels"...).
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    o.SerializerOptions.Converters.Add(new TimeOnlyConverter());
});

var jwt = config.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Key.Length < 32) throw new InvalidOperationException("Configure Jwt:Key com pelo menos 32 caracteres.");
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton(config.GetSection("Google").Get<GoogleOptions>() ?? new GoogleOptions());
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton(config.GetSection("Email").Get<EmailOptions>() ?? new EmailOptions());
builder.Services.AddSingleton(config.GetSection("Frontend").Get<FrontendOptions>() ?? new FrontendOptions());
builder.Services.AddSingleton<EmailQueue>();
builder.Services.AddHostedService<EmailSenderService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new()
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = jwt.SigningKey(),
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

// Atrás do nginx do CloudPanel: usa o IP real do cliente (X-Forwarded-For) no limite de tentativas.
// Só ligue onde a API não é acessível diretamente de fora (no Docker, a porta fica presa em 127.0.0.1).
if (config.GetValue<bool>("ReverseProxy:TrustForwardedHeaders"))
{
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
    });
}

// Limite de tentativas nas rotas de login/senha, por IP: dificulta adivinhar senhas.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "desconhecido",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
    o.OnRejected = (ctx, ct) => new ValueTask(Results
        .Problem("Muitas tentativas. Aguarde um minuto e tente de novo.", statusCode: StatusCodes.Status429TooManyRequests)
        .ExecuteAsync(ctx.HttpContext));
});

// JSON malformado ou enum desconhecido = 400 também em desenvolvimento (o padrão lá é lançar exceção).
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = false);
builder.Services.AddValidation();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi(o => o.AddDocumentTransformer((doc, _, _) =>
{
    doc.Components ??= new OpenApiComponents();
    doc.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
    doc.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
    };
    doc.Security = [new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", doc)] = [] }];
    return Task.CompletedTask;
}));

var app = builder.Build();

// Cria/atualiza o banco ao subir: sempre em desenvolvimento; em produção, com Database:MigrateOnStartup=true
// (basta para uma única instância da API, como na VPS).
if (app.Environment.IsDevelopment() || config.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(o => o.WithTitle("CreatorPubli API"));
}

if (config.GetValue<bool>("ReverseProxy:TrustForwardedHeaders")) app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).ExcludeFromDescription();
app.MapAuth();
app.MapCampaigns();
app.MapAccount();
app.MapPublic();

app.Run();
