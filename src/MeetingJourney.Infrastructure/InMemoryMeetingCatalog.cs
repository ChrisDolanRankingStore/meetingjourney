using MeetingJourney.Application;
using MeetingJourney.Domain;

namespace MeetingJourney.Infrastructure;

public sealed class InMemoryMeetingCatalog : IMeetingCatalog
{
    private readonly Meeting _meeting = SampleMeeting.Create();

    public Meeting GetCurrent() => _meeting;

    public Meeting? Get(string meetingId) =>
        string.Equals(_meeting.Id, meetingId, StringComparison.OrdinalIgnoreCase) ? _meeting : null;

    public MeetingPart? GetPart(string partId) =>
        _meeting.Parts.FirstOrDefault(part => string.Equals(part.Id, partId, StringComparison.OrdinalIgnoreCase));
}

internal static class SampleMeeting
{
    public static Meeting Create()
    {
        var parts = new List<MeetingPart>
        {
            Part("opening-song", null, "Song 21 and prayer", 5, MeetingSectionType.Opening, MeetingPartType.Song, "Begin the meeting together with song and prayer."),
            Part("opening-comments", null, "Opening comments", 1, MeetingSectionType.Opening, MeetingPartType.Comments, "A brief welcome and preview of the meeting."),
            Part("part-1", 1, "Hope Is Key to Contentment", 10, MeetingSectionType.Treasures, MeetingPartType.Talk, "Notice how Baruch became discontent, how discontent can affect joy and decisions, and how Jehovah helped him refocus with hope.",
                activity: new EngagementActivity("activity-1", ActivityType.ClueCards, "Follow the hope trail", "Listen for the change from discontent to hope.",
                    new ClueMission("Follow the hope trail", "Notice what changes when Baruch is helped to look beyond his immediate situation.", new[]
                    {
                        "Listen for why Baruch was unhappy.",
                        "Notice what discontent can affect.",
                        "Look for the hopeful refocusing thought from Jeremiah 45:5."
                    }, "Jeremiah 45:3, 5", new[] { "A changed outlook", "Protecting joy", "Hope beyond today" }))),
            Part("part-2", 2, "Spiritual gems", 10, MeetingSectionType.Treasures, MeetingPartType.Talk, "Find one encouraging thought from Jeremiah 45–46 and keep it in your own words.",
                activity: new EngagementActivity("activity-2", ActivityType.SpotTheClue, "Spot the gem", "Listen for an idea you would like to remember. One question considers why the sound of Egypt would be like a slithering serpent.")),
            Part("part-3", 3, "Bible reading", 4, MeetingSectionType.Treasures, MeetingPartType.BibleReading, "Listen to Jeremiah 46:13–24 and draw or write one image, word or idea that stays with you.",
                activity: new EngagementActivity("activity-3", ActivityType.DrawYourDiscovery, "Draw what stayed with you", "Make a quick sketch or use a few words to hold on to one image from the reading.")),
            Part("part-4", 4, "Starting a conversation", 3, MeetingSectionType.FieldMinistry, MeetingPartType.Demonstration, "Informal witnessing: notice how a conversation might begin with someone who looks happy.",
                activity: new EngagementActivity("activity-4", ActivityType.MyThoughtBubble, "My conversation thought", "What opening question would feel natural in this situation?")),
            Part("part-5", 5, "Starting a conversation", 2, MeetingSectionType.FieldMinistry, MeetingPartType.Demonstration, "House to house: notice a kind way to respond when the person is angry."),
            Part("part-6", 6, "Starting a conversation", 2, MeetingSectionType.FieldMinistry, MeetingPartType.Demonstration, "House to house: notice a kind way to respond when the person comes to the door looking sad."),
            Part("part-7", 7, "Talk", 4, MeetingSectionType.FieldMinistry, MeetingPartType.Talk, "Listen for the main idea in the talk about Jesus and how it could help in the ministry."),
            Part("living-song", null, "Song 117", 5, MeetingSectionType.Living, MeetingPartType.Song, "Sing together before the Living as Christians section."),
            Part("part-8", 8, "Share what you have with others", 15, MeetingSectionType.Living, MeetingPartType.Talk, "Consider why Christians share, what we can share and how to learn generosity now.",
                activity: new EngagementActivity("activity-8", ActivityType.MyThoughtBubble, "One thing I can share", "Choose one practical, kind idea you would like to remember this week.")),
            Part("part-9", 9, "Congregation Bible study", 30, MeetingSectionType.Living, MeetingPartType.CongregationBibleStudy, "Follow the study and record one personal discovery."),
            Part("closing-comments", null, "Concluding comments", 3, MeetingSectionType.Closing, MeetingPartType.Comments, "Review the meeting's main encouragement."),
            Part("closing-song", null, "Song 87 and prayer", 5, MeetingSectionType.Closing, MeetingPartType.Song, "Close the meeting together with song and prayer.")
        };

        var material = new MeetingMaterial(
            "Companion outline",
            "Meeting Journey is an independent companion. Use the official links for the meeting reading and material, then return here to record what you followed, noticed or want to remember.",
            new[]
            {
                new MeetingMaterialSection("theme", "This week's focus", "Keep seeking Jehovah's help. The meeting workbook covers October 19–25 and Jeremiah 45–46."),
                new MeetingMaterialSection("reading", "Bible reading", "Jeremiah 46:13–24. Listen for the images, ideas or words you would like to remember.", "Jeremiah 46:13–24"),
                new MeetingMaterialSection("treasures", "Treasures from God's Word", "Baruch became discontent, but Jehovah helped him refocus by giving him hope. The spiritual gems question considers the sound of Egypt in Jeremiah 46:22.", "Jeremiah 45:3, 5; Jeremiah 46:22"),
                new MeetingMaterialSection("ministry", "Apply yourself to the ministry", "The demonstrations explore starting conversations with people who are happy, angry or sad, followed by a talk about Jesus.", "Informal witnessing; house to house; lmd appendix A point 20"),
                new MeetingMaterialSection("living", "Living as Christians", "The discussion considers why Christians share, what we can share and how to learn generosity now.", "Hebrews 13:16; 2 Corinthians 8:2–4")
            },
            "https://www.jw.org/en/library/jw-meeting-workbook/september-october-2026-mwb/Life-and-Ministry-Meeting-Schedule-for-October-19-25-2026/",
            "https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=202026258");

        return new Meeting("meeting-2026-10-19", new DateOnly(2026, 10, 19), "Keep seeking Jehovah's help", "Jeremiah 45–46", material, parts);
    }

    private static MeetingPart Part(
        string id,
        int? number,
        string title,
        int minutes,
        MeetingSectionType section,
        MeetingPartType type,
        string summary,
        ReferenceLink[]? refs = null,
        EngagementActivity? activity = null) =>
        new(id, number, title, minutes, section, type, summary,
            refs ?? Array.Empty<ReferenceLink>(),
            activity is null ? Array.Empty<EngagementActivity>() : new[] { activity });
}
