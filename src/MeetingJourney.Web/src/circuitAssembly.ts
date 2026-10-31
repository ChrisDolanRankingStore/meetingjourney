import {localDateKey, parseCalendarDate, weekOfDate, type MeetingDays} from '../../../node-app/meeting-schedule.js';
import {readCircuitVisit, resolveVisitSelection, VISIT_UPDATED} from './circuitVisit.ts';
import {t} from './i18n.ts';
import {conventionDates, readConvention} from './convention.ts';
import type {Meeting, MeetingPart, ProgrammePartType} from './types';
export {VISIT_UPDATED as ASSEMBLY_UPDATED};
export type AssemblyType = 'circuit-overseer' | 'branch-representative';
export interface CircuitAssembly {date: string; type: AssemblyType; programme: '2026-2027';}
export type JourneySelection = {type: 'midweek' | 'weekend' | 'assembly' | 'convention'; date: string};
export type JourneyOverride = JourneySelection & {chosenOn: string};
type Reader = Pick<Storage, 'getItem'>;
const key = (date: string) => `mj-circuit-assembly:${weekOfDate(date)}`;
export function readCircuitAssembly(date: string, storage: Reader): CircuitAssembly | null {
  try {
    const raw = storage.getItem(key(date));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw Error('Invalid assembly date.');
    const record = value as Partial<CircuitAssembly>;
    if (typeof record.date !== 'string' || ![0, 6].includes(parseCalendarDate(record.date).getDay()) ||
      weekOfDate(record.date) !== weekOfDate(date) || !['circuit-overseer', 'branch-representative'].includes(record.type ?? '') ||
      record.programme !== '2026-2027') throw Error('Invalid assembly programme.');
    return record as CircuitAssembly;
  } catch (error) { console.warn('Could not read the saved circuit assembly.', error); return null; }
}
export function saveCircuitAssembly(value: CircuitAssembly, storage: Reader & Pick<Storage, 'setItem'>) {
  const day = parseCalendarDate(value.date);
  if (![0, 6].includes(day.getDay())) throw Error('Choose a Saturday or Sunday for the assembly.');
  if (!['circuit-overseer', 'branch-representative'].includes(value.type) || value.programme !== '2026-2027') throw Error('Choose a supported assembly programme.');
  if (value.date < '2026-09-01' || value.date > '2027-08-31') throw Error('The bundled programmes cover September 2026 to August 2027. Choose a date in that service year.');
  if (readCircuitVisit(value.date, storage).enabled) throw Error('This week already has a circuit overseer visit. Turn that visit off before saving an assembly.');
  if (readConvention(value.date, storage)) throw Error('This week already has a convention. Remove it before saving an assembly.');
  storage.setItem(key(value.date), JSON.stringify(value));
}
export function removeCircuitAssembly(date: string, storage: Pick<Storage, 'removeItem'>) { storage.removeItem(key(date)); }
export function savedAssemblies(storage: Reader & Pick<Storage, 'length' | 'key'>): CircuitAssembly[] {
  const records: CircuitAssembly[] = [];
  for (let index = 0; index < storage.length; index++) {
    const storedKey = storage.key(index);
    if (!storedKey?.startsWith('mj-circuit-assembly:')) continue;
    const record = readCircuitAssembly(storedKey.slice('mj-circuit-assembly:'.length), storage);
    if (record) records.push(record);
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}
export function suggestJourney(today: string, days: MeetingDays, storage: Reader): JourneySelection {
  const start = parseCalendarDate(today);
  for (let offset = 0; offset < 21; offset++) {
    const day = new Date(start); day.setDate(day.getDate() + offset);
    const date = localDateKey(day), convention = readConvention(date, storage), assembly = readCircuitAssembly(date, storage);
    if (convention) {
      const next = conventionDates(convention.date).find(day => day >= today);
      if (next) return {type:'convention',date:next};
      continue;
    }
    if (assembly) {
      if (assembly.date >= today) return {type: 'assembly', date: assembly.date};
      continue;
    }
    const suggestion = resolveVisitSelection(date, days, null, storage);
    if (suggestion.date === date) return suggestion;
  }
  throw Error('No meeting date could be selected.');
}
export function resolveJourney(today: string, days: MeetingDays, override: JourneyOverride | null, storage: Reader): JourneySelection {
  if (override?.chosenOn === today) {
    try {
      parseCalendarDate(override.date);
      if (['midweek', 'weekend', 'assembly', 'convention'].includes(override.type)) {
        const convention = readConvention(override.date, storage);
        if (convention) return {type:'convention',date:conventionDates(convention.date).includes(override.date) ? override.date : convention.date};
        const assembly = readCircuitAssembly(override.date, storage);
        if (assembly) return {type: 'assembly', date: assembly.date};
        if (override.type === 'midweek' || override.type === 'weekend') return resolveVisitSelection(today, days, {...override, type: override.type}, storage);
      }
    } catch (error) { console.warn('Could not use the saved meeting date.', error); }
  }
  return suggestJourney(today, days, storage);
}

interface ProgrammeRow {
  id: string; title: string; time?: string; minutes?: number; song?: number; question?: number; reference?: string; prompt?: string; type?: ProgrammePartType;
}
const coRows: ProgrammeRow[] = [
  {id:'morning-music', title:'Music', time:'09:40'},
  {id:'opening-song', title:'Song 31 and prayer', time:'09:50', song:31},
  {id:'trust-heart', title:'Why “Trust In Jehovah With All Your Heart”?', time:'10:00', minutes:15, question:1, reference:'Proverbs 3:5, 6', prompt:'Keep one way you want to show trust.'},
  {id:'barak', type:'Symposium', title:'Imitate Those Who Trusted In Jehovah! — Barak', time:'10:15', question:2, reference:'Luke 16:10', prompt:'Keep one detail from this example of trust.'},
  {id:'shunammite', type:'Symposium', title:'Imitate Those Who Trusted In Jehovah! — The Shunammite Woman', question:2, reference:'Psalm 50:15', prompt:'Keep one detail from this example of trust.'},
  {id:'daniel', type:'Symposium', title:'Imitate Those Who Trusted In Jehovah! — Daniel, Hananiah, Mishael, and Azariah', question:2, reference:'Psalm 119:112', prompt:'Keep one detail from this example of trust.'},
  {id:'morning-song', title:'Song 57 and announcements', time:'11:05', song:57},
  {id:'help-others', title:'Help Others Trust In the “Living and True God”', time:'11:15', minutes:20, question:3, reference:'1 Corinthians 9:19-23', prompt:'Keep an idea for connecting with someone different from you.'},
  {id:'baptism', type:'Baptism', title:'Baptism: “Your Father Who Looks On in Secret Will Repay You”', time:'11:35', minutes:30},
  {id:'midday-song', title:'Song 29', time:'12:05', song:29},
  {id:'afternoon-music', title:'Music', time:'13:20'},
  {id:'afternoon-song', title:'Song 8 and prayer', time:'13:30', song:8},
  {id:'public-discourse', type:'PublicTalk', title:'Public Bible Discourse: Whom Can You Really Trust?', time:'13:35', minutes:30},
  {id:'watchtower-summary', type:'WatchtowerSummary', title:'Summary of The Watchtower', time:'14:05', minutes:30},
  {id:'afternoon-announcements', title:'Song 135 and announcements', time:'14:35', song:135},
  {id:'children', type:'Symposium', title:'Trust In Jehovah’s Wisdom — When Guiding Your Children', time:'14:45', question:4, reference:'Proverbs 22:6', prompt:'Keep one practical use of wisdom.'},
  {id:'future', type:'Symposium', title:'Trust In Jehovah’s Wisdom — When Planning Your Future', question:4, reference:'Proverbs 16:3', prompt:'Keep one practical use of wisdom.'},
  {id:'temptation', type:'Symposium', title:'Trust In Jehovah’s Wisdom — When Facing Temptation', question:4, reference:'1 Corinthians 10:13', prompt:'Keep one practical use of wisdom.'},
  {id:'concluding-talk', title:'“Happy Is the One Trusting In Jehovah”', time:'15:30', minutes:30, question:5, reference:'Proverbs 16:20', prompt:'Keep a reason to continue trusting.'},
  {id:'closing-song', title:'Song 54 and prayer', time:'16:00', song:54}
];
const branchRows: ProgrammeRow[] = [
  {id:'morning-music', title:'Music', time:'09:40'},
  {id:'opening-song', title:'Song 7 and prayer', time:'09:50', song:7},
  {id:'delight', title:'“Find Exquisite Delight in Jehovah” — How?', time:'10:00', minutes:15, question:1, reference:'Psalm 37:4', prompt:'Keep a source of lasting joy.'},
  {id:'forgiveness', title:'“Happy Is the One . . . Whose Sin Is Forgiven”', time:'10:15', minutes:15, question:2, reference:'Psalm 32:1, 2', prompt:'Keep an encouraging thought about forgiveness.'},
  {id:'worship', title:'“Happy Are Those Dwelling in Your House!”', time:'10:30', minutes:25, question:3, reference:'Psalm 84:4, 10', prompt:'Keep a reason worship matters to you.'},
  {id:'morning-song', title:'Song 37 and announcements', time:'10:55', song:37},
  {id:'refuge', title:'‘Happy Is the Man Who Takes Refuge in Jehovah’', time:'11:05', minutes:30, question:4, reference:'Psalm 34:8; Psalm 18:25', prompt:'Keep a thought that helps during a challenge.'},
  {id:'baptism', type:'Baptism', title:'Baptism: “Your Father Who Looks On in Secret Will Repay You”', time:'11:35', minutes:30},
  {id:'midday-song', title:'Song 38', time:'12:05', song:38},
  {id:'afternoon-music', title:'Music', time:'13:20'},
  {id:'afternoon-song', title:'Song 111', time:'13:30', song:111},
  {id:'experiences', type:'Experiences', title:'Experiences', time:'13:35', minutes:10},
  {id:'watchtower-summary', type:'WatchtowerSummary', title:'Summary of The Watchtower', time:'13:45', minutes:30},
  {id:'simple-life', type:'Symposium', title:'Cultivate What Brings True Happiness — A Simple Lifestyle', time:'14:15', question:5, reference:'1 Timothy 6:7, 8', prompt:'Keep something that supports genuine happiness.'},
  {id:'friends', type:'Symposium', title:'Cultivate What Brings True Happiness — Good Friends', question:5, reference:'Proverbs 18:24', prompt:'Keep something that supports genuine happiness.'},
  {id:'family', type:'Symposium', title:'Cultivate What Brings True Happiness — Family Unity', question:5, reference:'Psalm 127:1, 2', prompt:'Keep something that supports genuine happiness.'},
  {id:'afternoon-announcements', title:'Song 88 and announcements', time:'15:00', song:88},
  {id:'concluding-talk', title:'“Happy Is the People Whose God Is Jehovah!”', time:'15:10', minutes:45, question:6, reference:'Micah 2:12; James 3:17; 1 Peter 5:8', prompt:'Keep a way to protect your joy.'},
  {id:'closing-song', title:'Song 161 and prayer', time:'15:55', song:161}
];
export function assemblyMeeting(record: CircuitAssembly): Meeting {
  const co = record.type === 'circuit-overseer', document = co ? 1102027246 : 1102027242;
  const url = `https://www.jw.org/finder?wtlocale=E&docid=${document}`;
  const questions = `https://www.jw.org/finder?wtlocale=E&docid=${document + 1}`;
  const rows = co ? coRows : branchRows;
  const theme = co ? '“Happy Is the One Trusting In Jehovah”' : '“Find Exquisite Delight in Jehovah”';
  return {
    id:`assembly-${record.type}-${record.date}`, kind:'assembly', weekOf:weekOfDate(record.date), eventDate:record.date, theme,
    bibleReading:co ? 'Proverbs 16:20' : 'Psalm 37:4', contentStatus:'dated',
    contentNotice:'This assembly replaces both congregation meetings this week. Programme: 2026–2027.',
    material:{title:theme, introduction:'Open the official programme for the full schedule and review questions. Your personal answers stay on this device.',
      appUrl:url, sourceUrl:url, sections:[{id:'assembly', heading:'Assembly programme', body:'Talk titles and order follow the official programme. Symposium sub-talk lengths are not published; no individual duration is assumed.', sourceUrl:url},
        {id:'questions', heading:'Programme review questions', body:'Use the official questions as listening goals. Keep your own thoughts or sketches; no suggested answers are supplied.', sourceUrl:questions}]},
    parts:rows.map((row): MeetingPart => ({
      id:row.id, title:row.title, durationMinutes:row.minutes ?? 0, programmeTime:row.time,
      section:row.id === 'closing-song' ? 'Closing' : row.id === 'opening-song' || row.id === 'morning-music' ? 'Opening' : 'Programme',
      type:row.type ?? (row.song ? 'Song' : row.id.endsWith('music') ? 'Music' : 'Talk'), songNumber:row.song,
      summary:row.prompt ?? 'Keep a personal thought, scripture or sketch from this programme part.',
      ...(row.question ? {assemblyQuestion:row.question, question:row.prompt, textReference:row.reference, researchUrl:questions} : {}),
      appUrl:url, sourceUrl:url, references:[], activities:[]
    }))
  };
}
export function partTiming(part: MeetingPart): string {
  return part.programmeTime ?? (part.durationMinutes ? `${part.durationMinutes}${t(' min')}` : t('Symposium'));
}
