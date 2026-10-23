using MeetingJourney.Domain;

namespace MeetingJourney.Application;

public interface IMeetingCatalog
{
    Meeting GetCurrent();
    Meeting? Get(string meetingId);
    MeetingPart? GetPart(string partId);
}
