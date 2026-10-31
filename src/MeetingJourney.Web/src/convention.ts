import {localDateKey, parseCalendarDate, weekOfDate} from '../../../node-app/meeting-schedule.js';
import type {Meeting, MeetingPart, ProgrammePartType} from './types';
type Reader = Pick<Storage, 'getItem'>;
export interface Convention {date: string; programme: '2026';}
const key = (date: string) => `mj-convention:${weekOfDate(date)}`;
export function conventionDates(friday: string): string[] {
  const start = parseCalendarDate(friday);
  return [0, 1, 2].map(offset => { const day = new Date(start); day.setDate(day.getDate() + offset); return localDateKey(day); });
}
export function readConvention(date: string, storage: Reader): Convention | null {
  try {
    const raw = storage.getItem(key(date));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw Error('Invalid convention date.');
    const record = value as Partial<Convention>;
    if (typeof record.date !== 'string' || parseCalendarDate(record.date).getDay() !== 5 ||
      weekOfDate(record.date) !== weekOfDate(date) || record.programme !== '2026') throw Error('Invalid convention programme.');
    return record as Convention;
  } catch (error) { console.warn('Could not read the saved convention.', error); return null; }
}
export function saveConvention(value: Convention, storage: Reader & Pick<Storage, 'setItem'>) {
  const date = parseCalendarDate(value.date);
  if (date.getDay() !== 5) throw Error('Choose the Friday on which the convention starts.');
  if (date.getFullYear() !== 2026 || value.programme !== '2026') throw Error('The bundled convention programme is for 2026. Other years need their own reviewed programme.');
  if (storage.getItem(`mj-circuit-assembly:${weekOfDate(value.date)}`)) throw Error('This week already has an assembly. Remove it before saving a convention.');
  const visit = storage.getItem(`mj-circuit-visit:${weekOfDate(value.date)}`);
  if (visit) {
    const parsed: unknown = JSON.parse(visit);
    if (parsed && typeof parsed === 'object' && 'enabled' in parsed && parsed.enabled === true) throw Error('This week already has a circuit overseer visit. Turn that visit off before saving a convention.');
  }
  storage.setItem(key(value.date), JSON.stringify(value));
}
export function removeConvention(date: string, storage: Pick<Storage, 'removeItem'>) {storage.removeItem(key(date));}
export function savedConventions(storage: Reader & Pick<Storage, 'length' | 'key'>): Convention[] {
  const records: Convention[] = [];
  for (let index = 0; index < storage.length; index++) {
    const storedKey = storage.key(index);
    if (!storedKey?.startsWith('mj-convention:')) continue;
    const record = readConvention(storedKey.slice('mj-convention:'.length), storage);
    if (record) records.push(record);
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}
type Row = [id: string, title: string, time?: string, song?: number, reference?: string, type?: ProgrammePartType];
const friday: Row[] = [
  ['morning-music','Music-Video Presentation','09:20',undefined,undefined,'MusicVideo'],
  ['opening-song','Song 160 and prayer','09:30',160],
  ['chairman','Chairman’s Address: Abundant Happiness Forever — Is It Realistic?','09:40',undefined,'Psalm 16:11; Psalm 100:2','ChairmanAddress'],
  ['drama-4','The Good News According to Jesus: Episode 4 — “This Is Why I Have Come”','10:10',undefined,undefined,'Video'],
  ['morning-song','Song 17 and announcements','11:05',17],
  ['sicknesses','Messianic Prophecy Fulfilled! — “He Himself Took Our Sicknesses”','11:15',undefined,'Matthew 8:16, 17','Symposium'],
  ['quarrel','Messianic Prophecy Fulfilled! — “He Will Not Quarrel”',undefined,undefined,'Matthew 12:15-21','Symposium'],
  ['illustrations','Messianic Prophecy Fulfilled! — “Without an Illustration He Would Not Speak”',undefined,undefined,'Matthew 13:34, 35','Symposium'],
  ['midday-song','Song 14 and intermission','12:10',14],
  ['afternoon-music','Music-Video Presentation','13:35',undefined,undefined,'MusicVideo'],
  ['afternoon-song','Song 23','13:45',23],
  ['sabbath','What Did Jesus Teach Regarding the Sabbath?','13:50',undefined,'Matthew 12:1-14; John 5:1-17'],
  ['apostles','Imitate Those Who Ministered to Jesus! — The Apostles','14:10',undefined,'Luke 6:13, 15, 16','Symposium'],
  ['women','Imitate Those Who Ministered to Jesus! — Many Women',undefined,undefined,'Luke 8:1-3','Symposium'],
  ['announcements','Song 76 and announcements','14:50',76],
  ['robes','“Happy Are Those Who Wash Their Robes”','15:00',undefined,'Revelation 22:14'],
  ['closing-song','Song 155 and closing prayer','15:30',155]
];
const saturday: Row[] = [
  ['morning-music','Music-Video Presentation','09:20',undefined,undefined,'MusicVideo'],
  ['opening-song','Song 111 and prayer','09:30',111],
  ['teaching','“He Opened His Mouth and Began Teaching Them”','09:40',undefined,'Matthew 5:1, 2'],
  ['drama-5','The Good News According to Jesus: Episode 5 — “Astounded at His Way of Teaching”','09:50',undefined,undefined,'Video'],
  ['morning-song','Song 89 and announcements','10:25',89],
  ['prevent-happiness','What Can Prevent Us From Being Happy?','10:35',undefined,'Luke 6:24-26'],
  ['principle','Can You Discern the Principle Behind the Law?','10:50',undefined,'Matthew 5:17-48'],
  ['salt-light','Lessons From the Land of Jesus — Salt and Light','11:15',undefined,'Matthew 5:13-16','Symposium'],
  ['plants-animals','Lessons From the Land of Jesus — Plants and Animals',undefined,undefined,'Genesis 1:28, 29','Symposium'],
  ['baptism','Baptism: “Your Father Who Looks On in Secret Will Repay You”','11:40',undefined,'Matthew 6:6','Baptism'],
  ['midday-song','Song 51 and intermission','12:10',51],
  ['afternoon-music','Music-Video Presentation','13:35',undefined,undefined,'MusicVideo'],
  ['afternoon-song','Song 125','13:45',125],
  ['spiritual-need','“Happy Are . . . ” — “Those Conscious of Their Spiritual Need”','13:50',undefined,'Matthew 5:3','Symposium'],
  ['mourn','“Happy Are . . . ” — “Those Who Mourn”',undefined,undefined,'Matthew 5:4','Symposium'],
  ['mild','“Happy Are . . . ” — “The Mild-Tempered”',undefined,undefined,'Matthew 5:5','Symposium'],
  ['righteousness','“Happy Are . . . ” — “Those Hungering and Thirsting for Righteousness”',undefined,undefined,'Matthew 5:6','Symposium'],
  ['merciful','“Happy Are . . . ” — “The Merciful”',undefined,undefined,'Matthew 5:7','Symposium'],
  ['pure','“Happy Are . . . ” — “The Pure in Heart”',undefined,undefined,'Matthew 5:8','Symposium'],
  ['peace','“Happy Are . . . ” — “The Peacemakers”',undefined,undefined,'Matthew 5:9','Symposium'],
  ['persecuted','“Happy Are . . . ” — “Those Who Have Been Persecuted for Righteousness’ Sake”',undefined,undefined,'Matthew 5:10','Symposium'],
  ['reproach','“Happy Are . . . ” — “You When People Reproach You”',undefined,undefined,'Matthew 5:11, 12','Symposium'],
  ['announcements','Song 81 and announcements','15:20',81],
  ['anxiety','“Why Are You Anxious?”','15:30',undefined,'Matthew 6:19-33'],
  ['gate','“Go In Through the Narrow Gate”','15:55',undefined,'Matthew 7:12-14'],
  ['closing-song','Song 21 and closing prayer','16:30',21]
];
const sunday: Row[] = [
  ['morning-music','Music-Video Presentation','09:20',undefined,undefined,'MusicVideo'],
  ['opening-song','Song 68 and prayer','09:30',68],
  ['soil','Applying Lessons From Jesus’ Illustrations — Four Types of Soil','09:40',undefined,'Matthew 13:18-23','Symposium'],
  ['wheat','Applying Lessons From Jesus’ Illustrations — Wheat and Weeds',undefined,undefined,'Matthew 13:24-30','Symposium'],
  ['mustard','Applying Lessons From Jesus’ Illustrations — Mustard Grain',undefined,undefined,'Matthew 13:31, 32','Symposium'],
  ['leaven','Applying Lessons From Jesus’ Illustrations — Leaven',undefined,undefined,'Matthew 13:33','Symposium'],
  ['dragnet','Applying Lessons From Jesus’ Illustrations — Dragnet',undefined,undefined,'Matthew 13:47-50','Symposium'],
  ['morning-song','Song 64 and announcements','11:00',64],
  ['treasure','Public Bible Discourse: Have You Discovered the Treasure?','11:10',undefined,'Matthew 13:44-46','PublicTalk'],
  ['watchtower-summary','Summary of The Watchtower','11:40',undefined,undefined,'WatchtowerSummary'],
  ['midday-song','Song 140 and intermission','12:10',140],
  ['afternoon-music','Music-Video Presentation','13:35',undefined,undefined,'MusicVideo'],
  ['afternoon-song','Song 108','13:45',108],
  ['drama-6','The Good News According to Jesus: Episode 6 — “Are You the Coming One?”','13:50',undefined,undefined,'Video'],
  ['announcements','Song 120 and announcements','14:35',120],
  ['review','What Did You Learn?','14:45',undefined,undefined,'Review'],
  ['eyes','“Happy Are Your Eyes Because They See”','14:55',undefined,'Matthew 13:16, 17'],
  ['closing-song','Song 163 and closing prayer','15:45',163]
];
export function conventionMeeting(record: Convention, date: string): Meeting {
  const index = conventionDates(record.date).indexOf(date);
  if (index < 0) throw Error('Choose a day within the saved convention.');
  const names = ['Friday','Saturday','Sunday'], rows = [friday,saturday,sunday][index];
  const sourceUrl = `https://www.jw.org/finder?wtlocale=E&docid=${1102026194 + index}`;
  const parts: MeetingPart[] = rows.map(([id,title,time,song,reference,type]) => ({
    id, title, programmeTime:time, durationMinutes:0, songNumber:song,
    type:type ?? (song ? 'Song' : id.endsWith('music') ? 'Music' : 'Talk'),
    section:id === 'closing-song' ? 'Closing' : id === 'opening-song' || id === 'morning-music' ? 'Opening' : 'Programme',
    summary:'Keep a personal thought, scripture or sketch from this programme part.',
    textReference:reference, appUrl:sourceUrl, sourceUrl, references:[], activities:[]
  }));
  return {
    id:`convention-2026-${record.date}-${names[index].toLowerCase()}`, kind:'convention', eventDate:date, weekOf:weekOfDate(date),
    contentStatus:'dated', theme:'2026 “Eternal Happiness” Convention',
    bibleReading:['Matthew 5:3','Acts 20:35','Matthew 13:16'][index],
    contentNotice:'This convention replaces both congregation meetings this week. Choose Friday, Saturday or Sunday for its own notebook journey.',
    material:{title:names[index], introduction:'Talk titles and order follow the official programme. Symposium sub-talk lengths are not published; no individual duration is assumed.',
      appUrl:sourceUrl, sourceUrl, sections:[{id:'programme',heading:'Convention programme',body:'Open the official programme for the full schedule. Each day and talk keeps its own personal notes and drawings.',sourceUrl}]}, parts
  };
}
