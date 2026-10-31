import october19 from './content/midweek-2026-10-19.json' with {type: 'json'};
import { enrichMeeting } from './study-guides.js';
import { weekOfDate } from './meeting-schedule.js';
import october26 from './content/midweek-2026-10-26.json' with {type: 'json'};

// Only date-checked identifiers and outlines belong here. No article text or artwork.
// See docs/meeting-schedules.md for sources and weekly maintenance.
const studies = {
  '2026-10-19': { title: 'An Appeal on the Basis of Love', docid: '2026522', song: 106 },
  '2026-10-26': { title: 'Cherish “the Privilege of Fearlessly Rendering Sacred Service”', docid: '2026523', song: 62 }
};
const workbook = {
  '2026-10-26': { docid: '202026259', reading: 'Jeremiah 47–48', openingSong: 125, middleSong: 158, closingSong: 54 }
};
const finder = docid => `https://www.jw.org/finder?srcid=jwlshare&wtlocale=E&prefer=lang&docid=${docid}`;
const workbookIndex = 'https://www.jw.org/en/library/jw-meeting-workbook/';
const studyIndex = 'https://www.jw.org/en/library/magazines/';
const meetingInfo = 'https://www.jw.org/en/jehovahs-witnesses/meetings/';
const part = (id, title, durationMinutes, section, type, summary, extra = {}) => ({ id, title, durationMinutes, section, type, summary, references: [], activities: [], ...extra });
const mission = (id, objective) => [{
  id, type: 'ClueCards', title: 'One thought to keep', prompt: objective,
  mission: { title: 'One thought to keep', listeningObjective: objective, clues: [
    'Listen for a word or idea that catches your attention.',
    'Notice an example or scripture connected to that idea.',
    'Draw it or keep it in your own words. You can also just listen.'
  ] }
}];

export function getMeeting(kind, date) {
  if (kind !== 'midweek' && kind !== 'weekend') throw new RangeError('Choose midweek or weekend.');
  const weekOf = weekOfDate(date);
  if (kind === 'midweek' && weekOf === october26.meeting.weekOf) {
    return enrichMeeting(structuredClone(october26.meeting));
  }
  if (kind === 'midweek' && weekOf === october19.meeting.weekOf) {
    // Keep the legacy ID so existing notes and drawings remain attached.
    return enrichMeeting({ ...structuredClone(october19.meeting), kind, contentStatus: 'dated' });
  }
  return enrichMeeting(kind === 'weekend' ? weekendMeeting(weekOf) : midweekMeeting(weekOf));
}

function weekendMeeting(weekOf) {
  const study = studies[weekOf];
  const studyUrl = study ? finder(study.docid) : studyIndex;
  const studyTitle = study?.title ?? 'Watchtower study';
  return {
    id: `weekend-${weekOf}`, kind: 'weekend', weekOf, contentStatus: study ? 'dated' : 'general',
    contentNotice: study ? undefined : 'General weekend outline. This week’s study details have not been added; check the official study material.',
    theme: 'Weekend meeting', bibleReading: studyTitle,
    material: {
      title: 'Weekend companion outline', introduction: 'Follow the public talk and the study at your own pace. Read the official material in JW Library.',
      appUrl: studyUrl, sourceUrl: studyUrl,
      sections: [
        { id: 'theme', heading: 'Begin together', body: 'Listen to the song and settle in at your own pace.' },
        { id: 'public-talk', heading: 'Public talk', body: 'Listen for one helpful idea. The talk topic is chosen by your congregation.', sourceUrl: studyUrl },
        { id: 'watchtower', heading: studyTitle, body: 'Follow the study in JW Library. Keep a word, a sketch or a personal thought here.', sourceUrl: studyUrl },
        { id: 'closing', heading: 'Take a thought with you', body: 'You can return to your notes or drawing whenever you want.' }
      ]
    },
    parts: [
      part('opening-song', 'Opening song and prayer', 5, 'Opening', 'Song', 'Which words in the song stand out to you?', { appUrl: studyUrl, sourceUrl: studyUrl }),
      part('public-talk', 'Public talk', 30, 'PublicTalk', 'PublicTalk', 'Listen for one helpful idea or scripture. You can draw or write what you notice.', { appUrl: studyUrl, sourceUrl: studyUrl, activities: mission('talk-discovery', 'Notice one idea you would like to remember from the talk.') }),
      part('study-song', study ? `Song ${study.song}` : 'Song before the study', 5, 'Watchtower', 'Song', 'Is there a word or feeling in this song you would like to keep?', { appUrl: studyUrl }),
      part('watchtower-study', studyTitle, 60, 'Watchtower', 'WatchtowerStudy', 'Follow the discussion in JW Library. Keep a personal discovery in words or a drawing.', { appUrl: studyUrl, sourceUrl: studyUrl, activities: mission('study-discovery', 'Notice one thought from the discussion that helps you.') }),
      part('closing-song', 'Closing song and prayer', 5, 'Closing', 'Song', 'What would you like to take with you from today’s meeting?', { appUrl: studyUrl })
    ]
  };
}

function midweekMeeting(weekOf) {
  const entry = workbook[weekOf];
  const url = entry ? finder(entry.docid) : workbookIndex;
  const dated = Boolean(entry);
  return {
    id: `meeting-${weekOf}`, kind: 'midweek', weekOf, contentStatus: dated ? 'dated' : 'general',
    contentNotice: dated ? undefined : 'General midweek outline. This week’s detailed programme has not been added; check the official workbook.',
    theme: 'Life and Ministry Meeting', bibleReading: entry?.reading ?? 'Open the workbook for this week’s reading',
    material: { title: 'Midweek companion outline', introduction: 'Use this companion alongside the official workbook.', appUrl: url, sourceUrl: url, sections: [
      { id: 'theme', heading: 'Begin together', body: 'Settle in with the opening song.' },
      { id: 'treasures', heading: 'Listen and discover', body: 'Keep one thought from the Bible discussion or reading.' },
      { id: 'ministry', heading: 'Notice the conversations', body: 'Look for a helpful way of speaking or listening.' },
      { id: 'living', heading: 'Take an idea with you', body: 'Notice something that could help in everyday life.' }
    ] },
    parts: [
      part('opening-song', entry ? `Song ${entry.openingSong} and prayer` : 'Opening song and prayer', 5, 'Opening', 'Song', 'Which words in the song stand out?'),
      part('opening-comments', 'Opening comments', 1, 'Opening', 'Comments', 'Listen for what is coming next.'),
      part('part-1', 'Bible talk', 10, 'Treasures', 'Talk', 'Listen for a helpful thought from the Bible.', { activities: mission('talk-clues', 'Notice one encouraging thought.') }),
      part('part-2', 'Spiritual gems', 10, 'Treasures', 'Talk', 'What would you like to remember from the Bible discussion?', { question: 'What spiritual gem from this week\'s Bible reading would you like to remember?', textReference: entry?.reading, researchUrl: url }),
      part('part-3', 'Bible reading', 4, 'Treasures', 'BibleReading', entry ? 'Follow Jeremiah 48:1–13 in JW Library.' : 'Follow this week’s reading in JW Library.'),
      ...(dated ? [
        part('part-4', 'Starting a conversation', 3, 'FieldMinistry', 'Demonstration', 'Notice a kind way to begin a conversation.'),
        part('part-5', 'Following up', 4, 'FieldMinistry', 'Demonstration', 'Notice how the speaker listens and responds.'),
        part('part-6', 'Making disciples', 5, 'FieldMinistry', 'Demonstration', 'What could help someone learn?')
      ] : [part('ministry', 'Ministry demonstrations and talks', 15, 'FieldMinistry', 'Demonstration', 'Follow the individual items in the official workbook.')]),
      part('living-song', entry ? `Song ${entry.middleSong}` : 'Meeting song', 5, 'Living', 'Song', 'Which words do you notice?'),
      part(dated ? 'part-7' : 'living', dated ? 'Local needs' : 'Christian living discussion', 15, 'Living', 'Talk', 'Listen for something you could use in your own life.'),
      part(dated ? 'part-8' : 'study', 'Congregation Bible study', 30, 'Living', 'CongregationBibleStudy', 'Keep one personal discovery from the discussion.'),
      part('closing-comments', 'Concluding comments', 3, 'Closing', 'Comments', 'What would you like to take with you?'),
      part('closing-song', entry ? `Song ${entry.closingSong} and prayer` : 'Closing song and prayer', 5, 'Closing', 'Song', 'Finish together at your own pace.')
    ]
  };
}
