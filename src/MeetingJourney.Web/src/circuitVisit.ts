import {localDateKey, parseCalendarDate, weekOfDate, normaliseMeetingDays, resolveMeetingSelection, type MeetingDays, type MeetingOverride, type MeetingSelection} from '../../../node-app/meeting-schedule.js';
import {t, type Language} from './i18n.ts';
import type {Meeting, MeetingPart} from './types';
type Reader = Pick<Storage, 'getItem'>;
export interface CircuitVisit {enabled: boolean; overseerName: string; midweekTitle: string; publicTitle: string; concludingTitle: string;}
export const emptyVisit: CircuitVisit = {enabled: false, overseerName: '', midweekTitle: '', publicTitle: '', concludingTitle: ''};
export const VISIT_UPDATED = 'mj-circuit-visit-updated';
const key = (date: string) => `mj-circuit-visit:${weekOfDate(date)}`;
export function readCircuitVisit(date: string, storage: Reader): CircuitVisit {
  try {
    const raw: unknown = JSON.parse(storage.getItem(key(date)) ?? 'null');
    if (raw === null) return {...emptyVisit};
    if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid visit programme.');
    const fields = raw as Record<string, unknown>;
    const title = (name: string) => typeof fields[name] === 'string' ? fields[name].trim().slice(0, 120) : '';
    return {enabled: fields.enabled === true, overseerName: title('overseerName'), midweekTitle: title('midweekTitle'), publicTitle: title('publicTitle'), concludingTitle: title('concludingTitle')};
  } catch (error) {
    console.warn('Could not read the saved circuit overseer visit.', error);
    return {...emptyVisit};
  }
}
export function saveCircuitVisit(date: string, value: CircuitVisit, storage: Reader & Pick<Storage, 'setItem'>) {
  if (value.enabled && storage.getItem(`mj-circuit-assembly:${weekOfDate(date)}`)) throw Error('This week already has a circuit assembly. Remove that assembly before saving a visit.');
  if (value.enabled && storage.getItem(`mj-convention:${weekOfDate(date)}`)) throw Error('This week already has a convention. Remove it before saving a visit.');
  storage.setItem(key(date), JSON.stringify({enabled: value.enabled === true, overseerName: value.overseerName.trim().slice(0, 120), midweekTitle: value.midweekTitle.trim().slice(0, 120), publicTitle: value.publicTitle.trim().slice(0, 120), concludingTitle: value.concludingTitle.trim().slice(0, 120)}));
}
export function savedVisitWeeks(storage: Reader & Pick<Storage, 'length' | 'key'>): string[] {
  const weeks = new Set<string>();
  for (let index = 0; index < storage.length; index++) {
    const storedKey = storage.key(index);
    if (!storedKey?.startsWith('mj-circuit-visit:')) continue;
    const date = storedKey.slice('mj-circuit-visit:'.length);
    try {
      if (weekOfDate(date) !== date) throw new Error('Invalid saved visit week.');
    } catch (error) {
      console.warn('Could not read a saved circuit overseer visit date.', error);
      continue;
    }
    if (readCircuitVisit(date, storage).enabled) weeks.add(date);
  }
  return [...weeks].sort();
}
export function visitDates(date: string) {
  const tuesday = parseCalendarDate(weekOfDate(date)); tuesday.setDate(tuesday.getDate() + 1);
  const sunday = new Date(tuesday); sunday.setDate(sunday.getDate() + 5);
  return {tuesday: localDateKey(tuesday), sunday: localDateKey(sunday)};
}
export function suggestVisitMeeting(today: string, days: MeetingDays, storage: Reader): MeetingSelection {
  const start = parseCalendarDate(today), normal = normaliseMeetingDays(days);
  for (let offset = 0; offset < 14; offset++) {
    const day = new Date(start); day.setDate(day.getDate() + offset); const date = localDateKey(day);
    const schedule = readCircuitVisit(date, storage).enabled ? {midweek: 2, weekend: 0} : normal;
    for (const type of ['midweek', 'weekend'] as const) if (day.getDay() === schedule[type]) return {type, date};
  }
  return resolveMeetingSelection(today, days, null);
}
export function resolveVisitSelection(today: string, days: MeetingDays, override: MeetingOverride | null, storage: Reader): MeetingSelection {
  const selected = resolveMeetingSelection(today, days, override);
  if (override?.chosenOn !== today || override.type !== selected.type || override.date !== selected.date) return suggestVisitMeeting(today, days, storage);
  if (!readCircuitVisit(selected.date, storage).enabled) return selected;
  const dates = visitDates(selected.date);
  return {...selected, date: selected.type === 'midweek' ? dates.tuesday : dates.sunday};
}
export function applyCircuitVisit(meeting: Meeting, storage: Reader, language: Language): Meeting {
  const visit = readCircuitVisit(meeting.weekOf, storage);
  if (!visit.enabled) return meeting;
  const text = (value: string) => t(value, undefined, language);
  const talk = (id: string, title: string, section: MeetingPart['section']): MeetingPart => ({
    id, title, ...(visit.overseerName ? {speakerName: visit.overseerName} : {}), durationMinutes: 30, section, type: 'PublicTalk',
    summary: text('Listen to the circuit overseer’s talk. Keep a personal note or sketch.'), references: [], activities: []
  });
  if (meeting.kind === 'midweek') return {...meeting, parts: meeting.parts.map(part =>
    part.type === 'CongregationBibleStudy' || part.id === 'co-midweek-talk'
      ? talk('co-midweek-talk', visit.midweekTitle || text('Circuit overseer’s midweek talk'), 'Living') : part)};
  if (meeting.kind !== 'weekend') return meeting;
  const parts = meeting.parts.filter(part => part.id !== 'co-concluding-talk').map(part =>
    part.type === 'PublicTalk' ? talk('co-public-talk', visit.publicTitle || text('Circuit overseer’s public talk'), 'PublicTalk')
      : part.type === 'WatchtowerStudy' ? {...part, durationMinutes: 30} : part);
  const studyIndex = parts.findIndex(part => part.type === 'WatchtowerStudy');
  if (studyIndex >= 0) parts.splice(studyIndex + 1, 0, talk('co-concluding-talk', visit.concludingTitle || text('Circuit overseer’s concluding talk'), 'Closing'));
  return {...meeting, parts};
}
