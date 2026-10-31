import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {meetingLanguage,saveMeetingLanguage} from '../src/meetingLanguage.ts';
import {ageOptions,companionAsset,looksForAge,withCompanionAge,detailedPrompts} from '../src/companions.ts';
import {getMeeting} from '../../../node-app/meeting-catalog.js';
import {personalizeMeeting} from '../src/localMeetingDetails.ts';
import {bibleReferenceLinks} from '../src/i18n.ts';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};

test('midweek and weekend language choices are independent, remembered across weeks and overridable per meeting',()=>{
 const device=storage(),mid={id:'meeting-2026-10-19',kind:'midweek'},weekend={id:'weekend-2026-10-19',kind:'weekend'};
 device.setItem('mj-place:meeting-2026-10-19','part-3');
 saveMeetingLanguage(mid,'en',device);saveMeetingLanguage(weekend,'es',device);
 assert.equal(meetingLanguage(mid,device,'es'),'en');
 assert.equal(meetingLanguage(weekend,device,'en'),'es');
 assert.equal(meetingLanguage({id:'meeting-2026-10-26',kind:'midweek'},device,'es'),'en');
 assert.equal(meetingLanguage({id:'weekend-2026-10-26',kind:'weekend'},device,'en'),'es');
 saveMeetingLanguage({id:'weekend-2026-10-26',kind:'weekend'},'en',device);
 assert.equal(meetingLanguage(weekend,device,'en'),'es');
 assert.equal(device.getItem('mj-place:meeting-2026-10-19'),'part-3');
 device.setItem('mj-meeting-languages','{broken');
 assert.equal(meetingLanguage(mid,device,'es'),'es');
});

test('all adult age ranges have distinct complete original and accessorised portraits including wheelchair options',()=>{
 for(const age of ['adult20','adult35','adult40','adult60']){
  const looks=looksForAge(age);
  assert.equal(looks.length,8);assert.ok(detailedPrompts(age));
  const assets=new Set();
  for(const look of looks){
   const path=companionAsset({ageGroup:age,style:look.id,gender:look.gender,portrait:look.portrait});
   assert.ok(path.includes(age));assert.ok(existsSync(new URL('../public'+path,import.meta.url)),path);
   assets.add(path);
  }
  assert.equal(assets.size,8);assert.ok(looks.some(look=>look.id==='wheelchair-boy'));assert.ok(looks.some(look=>look.id==='wheelchair-girl'));
 }
 assert.deepEqual(ageOptions.map(age=>age.label),['5–10','11–12','13–19','20–34','35–39','40–59','60+']);
 const changed=withCompanionAge({ageGroup:'teen',style:'african-girl',gender:'girl',name:'My name',portrait:'prepared'},'adult60');
 assert.equal(changed.ageGroup,'adult60');assert.equal(changed.name,'My name');assert.equal(changed.portrait,'prepared');
 assert.ok(looksForAge(changed.ageGroup).some(look=>look.id===changed.style));
});

test('dated Sunday fallback links open the exact Watchtower study, and cached older meeting-information links are repaired',()=>{
 for(const [date,docid]of [['2026-10-25','2026522'],['2026-11-01','2026523']]){
  const original=getMeeting('weekend',date);
  for(const part of original.parts.filter(part=>['opening-song','public-talk'].includes(part.id))){
   assert.equal(new URL(part.appUrl).searchParams.get('docid'),docid);
  }
  original.parts[0].appUrl='https://www.jw.org/en/jehovahs-witnesses/meetings/';
  original.material.sections.find(section=>section.id==='public-talk').sourceUrl='https://www.jw.org/en/jehovahs-witnesses/meetings/';
  const localized=personalizeMeeting(original,storage(),'es');
  for(const link of [localized.parts[0].appUrl,localized.material.sections.find(section=>section.id==='public-talk').sourceUrl]){
   const url=new URL(link);assert.equal(url.searchParams.get('docid'),docid);assert.equal(url.searchParams.get('wtlocale'),'S');
  }
 }
});

test('Bible references preserve exact verse ranges in both languages',()=>{
 const english=bibleReferenceLinks('Jeremiah 46:13–24; 2 Corinthians 8:2–4','en');
 assert.equal(english.length,2);
 assert.equal(new URL(english[0].url).searchParams.get('bible'),'24046013-24046024');
 assert.equal(new URL(english[0].url).searchParams.get('wtlocale'),'E');
 assert.equal(new URL(english[1].url).searchParams.get('bible'),'47008002-47008004');
 const spanish=bibleReferenceLinks('Jeremías 46:13–24; 2 Corintios 8:2–4','es');
 assert.equal(spanish.length,2);
 assert.equal(new URL(spanish[0].url).searchParams.get('wtlocale'),'S');
 assert.match(spanish[0].url,/srcid=jwlshare/);
});

test('Spiritual gems carries a reviewed question, Bible reference and research handoff',()=>{
 const current=getMeeting('midweek','2026-10-19').parts.find(part=>part.id==='part-2');
 assert.equal(current.question,'Why would the sound of Egypt be like a slithering serpent?');
 assert.equal(current.textReference,'Jeremiah 46:22');
 assert.match(current.researchUrl,/docid=1200004566&par=18/);
 const next=getMeeting('midweek','2026-10-26').parts.find(part=>part.id==='part-2');
 assert.match(next.question,/juniper-tree/i);
 assert.equal(next.textReference,'Jeremiah 48:6');
 assert.match(next.researchUrl,/docid=1200002555&par=4/);
});
