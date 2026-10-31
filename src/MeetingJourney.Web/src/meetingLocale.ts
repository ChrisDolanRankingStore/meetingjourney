import {officialUrl, t, type Language} from './i18n.ts';
import {lookupSong, songNumberFromTitle} from './songs.ts';
import type {Meeting} from './types';

/** Only public programme fields are translated. Personal journal records never pass through here. */
export function localizeMeeting(meeting: Meeting, language: Language): Meeting {
  const text = (value: string) => t(value, undefined, language);
  const reference = (value: string) => text(value).replace(/Jeremiah/g, language === 'es' ? 'Jeremías' : 'Jeremiah').replace(/Hebrews/g, language === 'es' ? 'Hebreos' : 'Hebrews').replace(/Corinthians/g, language === 'es' ? 'Corintios' : 'Corinthians');
  const appUrl = officialUrl(meeting.material.appUrl, language);
  const partLink = (url?: string) => meeting.kind === 'weekend' && url && /\/(?:jehovahs-witnesses|testigos-de-jehova)\/(?:meetings|reuniones)\//.test(url) ? appUrl : officialUrl(url, language);
  const localProgrammeNotice = 'The public talk topic and opening and closing songs are chosen locally.';
  const contentNotice = meeting.contentNotice;
  const outdatedNotice = contentNotice === localProgrammeNotice || contentNotice === t(localProgrammeNotice, undefined, 'es');
  return {...meeting, theme: text(meeting.theme), bibleReading: reference(meeting.bibleReading),
    contentNotice: contentNotice && !outdatedNotice ? text(contentNotice) : undefined,
    material: {...meeting.material, title: text(meeting.material.title), introduction: text(meeting.material.introduction), appUrl,
      sourceUrl: appUrl ?? officialUrl(meeting.material.sourceUrl, language),
      sections: meeting.material.sections.map(section => ({...section, heading: text(section.heading), body: text(section.body), reference: section.reference ? reference(section.reference) : undefined,
        sourceUrl: partLink(section.sourceUrl)}))},
    parts: meeting.parts.map(part => {
      const number = part.type === 'Song' ? part.songNumber ?? songNumberFromTitle(part.title) : undefined;
      const song = lookupSong(number, language);
      return {...part, title: song ? `${text('Song')} ${number} - ${song.title}` : text(part.title), summary: text(part.summary),
        question: part.question ? text(part.question) : undefined,
        textReference: part.textReference ? reference(part.textReference) : undefined,
        researchUrl: part.researchUrl ? partLink(part.researchUrl) : undefined,
        ...(number ? {songNumber: number, songTitle: song?.title} : {}),
        appUrl: song?.appUrl ?? song?.url ?? partLink(part.appUrl), sourceUrl: song?.url ?? partLink(part.sourceUrl),
        references: part.references.map(link => ({...link, label: text(link.label), url: officialUrl(link.url, language) ?? link.url, note: link.note ? text(link.note) : undefined})),
        studyGuide: part.studyGuide ? {...part.studyGuide, cues: part.studyGuide.cues.map(cue => ({...cue, prompt: text(cue.prompt), pointChoices: cue.pointChoices?.map(text)}))} : undefined,
        activities: part.activities.map(activity => ({...activity, title: text(activity.title), prompt: text(activity.prompt),
          mission: activity.mission ? {...activity.mission, title: text(activity.mission.title), listeningObjective: text(activity.mission.listeningObjective), clues: activity.mission.clues.map(text),
            scriptureReference: activity.mission.scriptureReference ? reference(activity.mission.scriptureReference) : undefined,
            answerSuggestions: activity.mission.answerSuggestions?.map(text)} : undefined}))};
    })};
}
