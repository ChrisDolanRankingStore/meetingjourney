namespace MeetingJourney.Domain;

public enum MeetingSectionType
{
    Opening,
    Treasures,
    FieldMinistry,
    Living,
    Closing
}

public enum MeetingPartType
{
    Song,
    Prayer,
    Comments,
    Talk,
    BibleReading,
    Demonstration,
    CongregationBibleStudy
}

public enum ActivityType
{
    ClueCards,
    SpotTheClue,
    DrawYourDiscovery,
    MyThoughtBubble
}

public sealed record ReferenceLink(string Label, string Url, string? Note = null);

public sealed record MeetingMaterialSection(
    string Id,
    string Heading,
    string Body,
    string? Reference = null);

public sealed record MeetingMaterial(
    string Title,
    string Introduction,
    IReadOnlyList<MeetingMaterialSection> Sections,
    string? SourceUrl = null,
    string? AppUrl = null);

public sealed record ClueMission(
    string Title,
    string ListeningObjective,
    IReadOnlyList<string> Clues,
    string? ScriptureReference = null,
    IReadOnlyList<string>? AnswerSuggestions = null);

public sealed record EngagementActivity(
    string Id,
    ActivityType Type,
    string Title,
    string Prompt,
    ClueMission? Mission = null,
    string? DrawingTemplate = null);

public sealed record MeetingPart(
    string Id,
    int? Number,
    string Title,
    int DurationMinutes,
    MeetingSectionType Section,
    MeetingPartType Type,
    string Summary,
    IReadOnlyList<ReferenceLink> References,
    IReadOnlyList<EngagementActivity> Activities);

public sealed record Meeting(
    string Id,
    DateOnly WeekOf,
    string Theme,
    string BibleReading,
    MeetingMaterial Material,
    IReadOnlyList<MeetingPart> Parts);
