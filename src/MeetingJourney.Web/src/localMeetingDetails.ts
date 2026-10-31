import type {Meeting, MeetingPart} from './types';
import {getLanguage, t, type Language} from './i18n.ts';
import {localizeMeeting} from './meetingLocale.ts';
import {lookupSong, songbookUrl, songNumberFromTitle} from './songs.ts';
import {applyCircuitVisit} from './circuitVisit.ts';

export const DETAILS_UPDATED = 'mj-titles-updated';
type Reader = Pick<Storage, 'getItem'>;
type Writer = Reader & Pick<Storage, 'setItem'>;
export type SongDetails = {songNumber: number | null; songTitle: string; titleMode?: 'catalogue' | 'custom'};
export type TalkDetails = {title: string; speakerName: string};
type Details = Record<string, string | SongDetails | TalkDetails>;
const keyFor = (meetingId: string) => `mj-part-titles:${meetingId}`;

export function readMeetingDetails(meetingId: string, storage: Reader): Details {
  try {
    const raw: unknown = JSON.parse(storage.getItem(keyFor(meetingId)) ?? '{}');
    const clean: Details = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    for (const [id, value] of Object.entries(raw)) {
      if (typeof value === 'string') clean[id] = value.trim().slice(0, 120);
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('title' in value && 'speakerName' in value) {
          if (typeof value.title === 'string' && typeof value.speakerName === 'string') {
            clean[id] = {title: value.title.trim().slice(0, 120), speakerName: value.speakerName.trim().slice(0, 120)};
          }
          continue;
        }
        const song = value as Partial<SongDetails>;
        const validNumber = song.songNumber === null ||
          (Number.isInteger(song.songNumber) && song.songNumber! > 0 && song.songNumber! <= 999);
        if (validNumber && typeof song.songTitle === 'string') {
          const title = song.songTitle.trim().slice(0, 120);
          if (song.songNumber !== null || title) clean[id] = {songNumber: song.songNumber!, songTitle: title,
            ...(song.titleMode === 'catalogue' || song.titleMode === 'custom' ? {titleMode: song.titleMode} : {})};
        }
      }
    }
    return clean;
  } catch { return Object.create(null) as Details; }
}

export function songDraft(part: MeetingPart, meetingId: string, storage: Reader, language = getLanguage()): SongDetails {
  const entry = readMeetingDetails(meetingId, storage)[part.id];
  if (typeof entry === 'object' && 'songNumber' in entry) return entry.titleMode === 'catalogue'
    ? {...entry, songTitle: lookupSong(entry.songNumber, language)?.title ?? ''} : entry;
  const number = part.songNumber ?? songNumberFromTitle(part.title) ?? null;
  return {songNumber: number, songTitle: lookupSong(number, language)?.title ?? '', titleMode: 'catalogue'};
}

export function saveSongDetails(meetingId: string, partId: string, number: string, title: string, storage: Writer, options?: {automaticTitle: boolean}) {
  const value = number.trim();
  if (value && (!/^\d{1,3}$/.test(value) || Number(value) < 1)) {
    throw new Error('Use a whole song number from 1 to 999, or leave it blank.');
  }
  const songTitle = title.trim().slice(0, 120);
  if (!value && (!songTitle || options?.automaticTitle)) throw new Error('Add a song number or title, or choose Restore programme details.');
  const entries = readMeetingDetails(meetingId, storage);
  entries[partId] = {songNumber: value ? Number(value) : null, songTitle: options?.automaticTitle ? '' : songTitle,
    ...(options ? {titleMode: options.automaticTitle ? 'catalogue' as const : 'custom' as const} : {})};
  storage.setItem(keyFor(meetingId), JSON.stringify(entries));
}

export function saveLocalTitle(meetingId: string, partId: string, title: string, storage: Writer) {
  const entries = readMeetingDetails(meetingId, storage);
  const entry = entries[partId];
  if (typeof entry === 'object' && 'speakerName' in entry && entry.speakerName) entries[partId] = {...entry, title: title.trim().slice(0, 120)};
  else if (title.trim()) entries[partId] = title.trim().slice(0, 120);
  else delete entries[partId];
  storage.setItem(keyFor(meetingId), JSON.stringify(entries));
}

export function saveLocalTalkDetails(meetingId: string, partId: string, title: string, speakerName: string, storage: Writer) {
  const entries = readMeetingDetails(meetingId, storage);
  const value = {title: title.trim().slice(0, 120), speakerName: speakerName.trim().slice(0, 120)};
  if (value.title || value.speakerName) entries[partId] = value;
  else delete entries[partId];
  storage.setItem(keyFor(meetingId), JSON.stringify(entries));
}

export function personalizeMeeting(meeting: Meeting, storage: Reader, language: Language = 'en'): Meeting {
  const publishedProgramme = meeting.kind === 'assembly' || meeting.kind === 'convention';
  const localized = applyCircuitVisit(localizeMeeting(meeting, language),storage,language);
  const entries = readMeetingDetails(meeting.id, storage);
  return {...localized, parts: localized.parts.map(part => {
    if (part.id.startsWith('co-')) return part;
    const entry = entries[part.id];
    if (typeof entry === 'object' && 'speakerName' in entry && part.type !== 'Song' && part.type !== 'Music') {
      return {...part, ...(!publishedProgramme && entry.title ? {title: entry.title} : {}), speakerName: entry.speakerName || undefined};
    }
    if (publishedProgramme) return part;
    // Titles entered by the user are kept verbatim in either interface language.
    if (typeof entry === 'string' && entry) return {...part, title: entry};
    if (meeting.kind === 'weekend' && part.type === 'Song' && entry && typeof entry === 'object' && 'songNumber' in entry) {
      const song = lookupSong(entry.songNumber, language);
      const title = entry.titleMode === 'catalogue' ? song?.title ?? '' : entry.songTitle;
      const heading = entry.songNumber === null ? t('Song', undefined, language) : `${t('Song', undefined, language)} ${entry.songNumber}`;
      return {...part, songNumber: entry.songNumber ?? undefined, songTitle: title,
        title: title ? `${heading} - ${title}` : heading,
        appUrl: song?.appUrl ?? song?.url ?? songbookUrl(language), sourceUrl: song?.url ?? songbookUrl(language)};
    }
    return part;
  })};
}
