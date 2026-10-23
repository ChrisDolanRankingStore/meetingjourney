using MeetingJourney.Application;
using MeetingJourney.Infrastructure;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddSingleton<IMeetingCatalog, InMemoryMeetingCatalog>();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new
{
    service = "meeting-journey-api",
    status = "ok"
}));

app.MapGet("/api/v1", () => Results.Ok(new
{
    name = "Meeting Journey API",
    version = "v1",
    status = "phase-1"
}));

app.MapGet("/api/meetings/current", (IMeetingCatalog catalog) => Results.Ok(catalog.GetCurrent()));

app.MapGet("/api/meetings/{meetingId}", (string meetingId, IMeetingCatalog catalog) =>
    catalog.Get(meetingId) is { } meeting ? Results.Ok(meeting) : Results.NotFound());

app.MapGet("/api/meetings/{meetingId}/journey", (string meetingId, IMeetingCatalog catalog) =>
    catalog.Get(meetingId) is { } meeting
        ? Results.Ok(new { meetingId = meeting.Id, theme = meeting.Theme, stops = meeting.Parts.Select((part, index) => new
        {
            partId = part.Id,
            number = part.Number,
            title = part.Title,
            section = part.Section.ToString(),
            order = index + 1,
            durationMinutes = part.DurationMinutes
        }) })
        : Results.NotFound());

app.MapGet("/api/meetings/{meetingId}/parts", (string meetingId, IMeetingCatalog catalog) =>
    catalog.Get(meetingId) is { } meeting
        ? Results.Ok(meeting.Parts)
        : Results.NotFound());

app.MapGet("/api/parts/{partId}", (string partId, IMeetingCatalog catalog) =>
    catalog.GetPart(partId) is { } part ? Results.Ok(part) : Results.NotFound());

app.MapGet("/api/parts/{partId}/activities", (string partId, IMeetingCatalog catalog) =>
    catalog.GetPart(partId) is { } part ? Results.Ok(part.Activities) : Results.NotFound());

app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api") || context.Request.Path.StartsWithSegments("/health"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    var webRoot = app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
    var indexPath = Path.Combine(webRoot, "index.html");
    if (File.Exists(indexPath))
    {
        await context.Response.SendFileAsync(indexPath);
        return;
    }

    context.Response.StatusCode = StatusCodes.Status404NotFound;
});

app.Run();

public partial class Program { }
