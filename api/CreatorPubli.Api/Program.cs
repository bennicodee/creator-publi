using System.Text.Json;
using System.Text.Json.Serialization;
using CreatorPubli.Api.Auth;
using CreatorPubli.Api.Contracts;
using CreatorPubli.Api.Data;
using CreatorPubli.Api.Domain;
using CreatorPubli.Api.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

if (app.Environment.IsDevelopment())
{
    // Em desenvolvimento, cria/atualiza o banco ao subir. Em produção, rode as migrations no deploy.
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();

    app.MapOpenApi();
    app.MapScalarApiReference(o => o.WithTitle("CreatorPubli API"));
}

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" })).ExcludeFromDescription();
app.MapAuth();
app.MapCampaigns();
app.MapAccount();
app.MapPublic();

app.Run();
