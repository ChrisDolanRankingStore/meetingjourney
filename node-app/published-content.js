import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {weekOfDate} from './meeting-schedule.js';
import {enrichListeningPoints} from './study-guides.js';
export const contentDirectory=fileURLToPath(new URL('./content/',import.meta.url));
export function validatePublishedWeek(value){
 const meeting=value?.meeting;
 if(value?.approved!==true||typeof value.reviewedAt!=='string'||!Number.isFinite(Date.parse(value.reviewedAt))||!meeting||!['midweek','weekend'].includes(meeting.kind)||weekOfDate(meeting.weekOf)!==meeting.weekOf||meeting.id!==`${meeting.kind==='midweek'?'meeting':'weekend'}-${meeting.weekOf}`||typeof meeting.theme!=='string'||typeof meeting.bibleReading!=='string'||!meeting.material||!Array.isArray(meeting.material.sections)||!meeting.material.sections.length||!Array.isArray(meeting.parts)||!meeting.parts.length||meeting.parts.length>50)throw Error('A reviewed, date-matched meeting outline is required.');
 const ids=new Set();
 for(const part of meeting.parts){
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(part.id)||ids.has(part.id)||typeof part.title!=='string'||!part.title.trim()||typeof part.summary!=='string'||!Number.isFinite(part.durationMinutes)||part.durationMinutes<0||!['Opening','Treasures','FieldMinistry','Living','PublicTalk','Watchtower','Closing'].includes(part.section)||!Array.isArray(part.activities)||!Array.isArray(part.references))throw Error('Invalid meeting part.');ids.add(part.id);
  if(part.studyGuide){const guide=part.studyGuide;if(!Number.isInteger(guide.paragraphCount)||guide.paragraphCount<1||guide.paragraphCount>200||!Array.isArray(guide.cues)||guide.cues.some(c=>!Number.isInteger(c.from)||!Number.isInteger(c.to)||c.from<1||c.to<c.from||c.to>guide.paragraphCount||typeof c.prompt!=='string'))throw Error('Invalid reviewed study cues.');}
  if(part.listeningWords!==undefined){const words=part.listeningWords;if(!words||typeof words!=='object'||Array.isArray(words)||Object.keys(words).some(language=>!['en','es'].includes(language))||Object.values(words).some(list=>!Array.isArray(list)||list.length>40||list.some(word=>typeof word!=='string'||!word.trim()||word.length>60)))throw Error('Invalid listening words.');}
 }
 const walk=item=>{if(!item||typeof item!=='object')return;for(const[key,entry]of Object.entries(item)){if(['url','appUrl','sourceUrl'].includes(key)&&entry){const url=new URL(entry);if(url.protocol!=='https:'||!(url.hostname==='jw.org'||url.hostname.endsWith('.jw.org')))throw Error('Use an official HTTPS JW link.');}else if(typeof entry==='object')walk(entry);}};walk(meeting);
 if(JSON.stringify(value).length>1000000)throw Error('Outline too large.');
 for(const part of meeting.parts)for(const cue of part.studyGuide?.cues??[])if(cue.pointChoices!==undefined&&(!Array.isArray(cue.pointChoices)||cue.pointChoices.length!==3||cue.pointChoices.some(choice=>typeof choice!=='string'||!choice.trim()||choice.length>300)))throw Error('Invalid listening point choices');
 return enrichListeningPoints(meeting);
}
export function readPublishedMeeting(kind,date,directory=contentDirectory){const week=weekOfDate(date);if(!['midweek','weekend'].includes(kind))throw Error('Invalid meeting type');const path=join(directory,`${kind}-${week}.json`);if(!existsSync(path))return undefined;const meeting=validatePublishedWeek(JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,'')));if(meeting.kind!==kind||meeting.weekOf!==week)throw Error('Published file does not match its requested week.');return meeting;}
