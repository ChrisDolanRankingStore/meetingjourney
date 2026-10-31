import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assemblyMeeting, readCircuitAssembly, removeCircuitAssembly, resolveJourney, savedAssemblies, saveCircuitAssembly, suggestJourney} from '../src/circuitAssembly.ts';
import {conventionDates, conventionMeeting, readConvention, removeConvention, savedConventions, saveConvention} from '../src/convention.ts';
import {emptyVisit, saveCircuitVisit} from '../src/circuitVisit.ts';
import {localizeMeeting} from '../src/meetingLocale.ts';
import {allowsComments} from '../src/listeningPreferences.ts';
import {hasListeningTools, programmePartLabels, programmePartLabel} from '../src/programmeParts.ts';
import {storyMoment} from '../src/journeyExperience.ts';
import {buildDiscoveryTreasures} from '../src/discoveryBook.ts';
import {t} from '../src/i18n.ts';
const memory = () => {
  const data = new Map();
  return {get length() {return data.size;}, key:index=>[...data.keys()][index]??null, getItem:key=>data.get(key)??null,
    setItem:(key,value)=>data.set(key,value), removeItem:key=>data.delete(key)};
};
const co = {date:'2026-11-21',type:'circuit-overseer',programme:'2026-2027'};
const branch = {date:'2027-03-14',type:'branch-representative',programme:'2026-2027'};
const convention = {date:'2026-07-24',programme:'2026'};
const days = {midweek:3,weekend:0};

test('both assembly dates persist independently and only Saturday or Sunday in the supported service year is accepted',()=>{
  const storage=memory();
  saveCircuitAssembly(co,storage);saveCircuitAssembly(branch,storage);
  assert.deepEqual(savedAssemblies(storage),[co,branch]);
  assert.deepEqual(readCircuitAssembly('2026-11-18',storage),co);
  for(const date of ['2026-11-20','2026-02-30','2026-08-30','2027-09-04'])assert.throws(()=>saveCircuitAssembly({...co,date},storage));
  assert.throws(()=>saveCircuitAssembly({...co,programme:'2025-2026'},storage),/supported/);
  removeCircuitAssembly(co.date,storage);
  assert.equal(readCircuitAssembly(co.date,storage),null);assert.deepEqual(savedAssemblies(storage),[branch]);
});

test('Saturday and Sunday assemblies suppress both normal meetings only during their own week',()=>{
  for(const record of [co,{...co,date:'2026-11-22'}]){
    const storage=memory();saveCircuitAssembly(record,storage);
    for(const date of ['2026-11-16','2026-11-18','2026-11-20',record.date]){
      assert.deepEqual(suggestJourney(date,days,storage),{type:'assembly',date:record.date});
      for(const type of ['midweek','weekend'])assert.deepEqual(resolveJourney('2026-10-27',days,{type,date,chosenOn:'2026-10-27'},storage),{type:'assembly',date:record.date});
    }
    assert.deepEqual(suggestJourney('2026-11-23',days,storage),{type:'midweek',date:'2026-11-25'});
    if(record.date==='2026-11-21')assert.deepEqual(suggestJourney('2026-11-22',days,storage),{type:'midweek',date:'2026-11-25'});
    assert.deepEqual(suggestJourney('2026-11-15',days,storage),{type:'weekend',date:'2026-11-15'});
  }
});

test('assembly programmes have every published stop, song and question association without invented symposium times',()=>{
  const expected=[
    [co,20,[31,57,29,8,135,54],5,'16:00',1102027246],
    [branch,19,[7,37,38,111,88,161],6,'15:55',1102027242]
  ];
  for(const [record,count,songs,questions,closing,document] of expected){
    const meeting=assemblyMeeting(record);
    assert.equal(meeting.parts.length,count);
    assert.deepEqual(meeting.parts.filter(part=>part.type==='Song').map(part=>part.songNumber),songs);
    assert.equal(meeting.parts.at(-1).programmeTime,closing);
    assert.equal(new Set(meeting.parts.map(part=>part.id)).size,count);
    assert.equal(new Set(meeting.parts.map(part=>part.assemblyQuestion).filter(Boolean)).size,questions);
    for(const part of meeting.parts){
      assert.equal(allowsComments(part.type),false);
      assert.match(part.appUrl,new RegExp(`docid=${document}`));
      if(part.assemblyQuestion){assert.match(part.researchUrl,new RegExp(`docid=${document+1}`));assert.ok(part.textReference);assert.ok(part.question);}
    }
    assert.ok(meeting.parts.some(part=>!part.programmeTime&&part.durationMinutes===0));
    assert.equal(meeting.parts.find(part=>part.id==='watchtower-summary').type,'WatchtowerSummary');
  }
  assert.notEqual(assemblyMeeting(co).id,assemblyMeeting({...co,date:'2026-11-22'}).id);
  assert.notEqual(assemblyMeeting(co).id,assemblyMeeting({...co,type:'branch-representative'}).id);
});

test('event programme items retain their real categories, listening tools and notebook routes',()=>{
  const programmes=[assemblyMeeting(co),assemblyMeeting(branch),...conventionDates(convention.date).map(date=>conventionMeeting(convention,date))];
  const expected=[
    {'trust-heart':'Talk',barak:'Symposium',shunammite:'Symposium',baptism:'Baptism','public-discourse':'PublicTalk','watchtower-summary':'WatchtowerSummary',children:'Symposium'},
    {delight:'Talk',experiences:'Experiences','simple-life':'Symposium',friends:'Symposium',baptism:'Baptism','watchtower-summary':'WatchtowerSummary'},
    {chairman:'ChairmanAddress','drama-4':'Video',sicknesses:'Symposium',quarrel:'Symposium',sabbath:'Talk'},
    {'drama-5':'Video','salt-light':'Symposium','plants-animals':'Symposium',baptism:'Baptism','spiritual-need':'Symposium',reproach:'Symposium'},
    {soil:'Symposium',dragnet:'Symposium',treasure:'PublicTalk','watchtower-summary':'WatchtowerSummary','drama-6':'Video',review:'Review'}
  ];
  for(const [index,meeting] of programmes.entries()){
    for(const [id,type] of Object.entries(expected[index]))assert.equal(meeting.parts.find(part=>part.id===id)?.type,type);
    assert.equal(meeting.parts.filter(part=>part.type==='PublicTalk').length,[1,0,0,0,1][index]);
    for(const part of meeting.parts){
      assert.equal(part.section,['morning-music','opening-song'].includes(part.id)?'Opening':part.id==='closing-song'?'Closing':'Programme');
      assert.ok(Object.hasOwn(programmePartLabels,part.type));
      assert.equal(hasListeningTools(part.type),!['Song','Music','MusicVideo'].includes(part.type));
      assert.equal(allowsComments(part.type),false);
      assert.ok(storyMoment(part,meeting.weekOf).image);
      const treasures=buildDiscoveryTreasures(meeting,[{meetingId:meeting.id,partId:part.id,text:'My note'}],[]);
      assert.equal(treasures.length,1);assert.ok(Number.isFinite(treasures[0].position.x));
    }
  }
  for(const type of Object.keys(programmePartLabels)){
    const label=programmePartLabel(type);
    assert.notEqual(t(label,undefined,'es'),label,`Missing Spanish category: ${label}`);
  }
  assert.equal(hasListeningTools('WatchtowerStudy'),true);
  assert.equal(hasListeningTools('CongregationBibleStudy'),true);
  assert.equal(hasListeningTools('BibleReading'),false);
});

test('convention dates cover Friday through Sunday and each day automatically replaces that week’s meetings',()=>{
  const storage=memory();saveConvention(convention,storage);
  assert.deepEqual(savedConventions(storage),[convention]);
  assert.deepEqual(readConvention('2026-07-26',storage),convention);
  assert.deepEqual(conventionDates(convention.date),['2026-07-24','2026-07-25','2026-07-26']);
  for(const date of ['2026-07-20','2026-07-22','2026-07-24'])assert.deepEqual(suggestJourney(date,days,storage),{type:'convention',date:'2026-07-24'});
  for(const date of ['2026-07-25','2026-07-26'])assert.deepEqual(suggestJourney(date,days,storage),{type:'convention',date});
  assert.deepEqual(suggestJourney('2026-07-27',days,storage),{type:'midweek',date:'2026-07-29'});
  for(const date of ['2026-07-22','2026-07-24','2026-07-25','2026-07-26']){
    assert.deepEqual(resolveJourney('2026-10-27',days,{type:'midweek',date,chosenOn:'2026-10-27'},storage),{type:'convention',date:date<'2026-07-24'?'2026-07-24':date});
  }
  assert.throws(()=>saveConvention({...convention,date:'2026-07-25'},storage),/Friday/);
  assert.throws(()=>saveConvention({...convention,date:'2027-07-23'},storage),/2026/);
  removeConvention(convention.date,storage);assert.equal(readConvention(convention.date,storage),null);
});

test('all three convention days include every published stop and separate symposium notebooks',()=>{
  const expected=[
    ['2026-07-24',17,[160,17,14,23,76,155],'15:30',1102026194],
    ['2026-07-25',26,[111,89,51,125,81,21],'16:30',1102026195],
    ['2026-07-26',18,[68,64,140,108,120,163],'15:45',1102026196]
  ];
  const ids=new Set();
  for(const [date,count,songs,closing,document] of expected){
    const meeting=conventionMeeting(convention,date);ids.add(meeting.id);
    assert.equal(meeting.eventDate,date);assert.equal(meeting.parts.length,count);
    assert.equal(new Set(meeting.parts.map(part=>part.id)).size,count);
    assert.deepEqual(meeting.parts.filter(part=>part.type==='Song').map(part=>part.songNumber),songs);
    assert.equal(meeting.parts.at(-1).programmeTime,closing);
    for(const part of meeting.parts){assert.equal(allowsComments(part.type),false);assert.match(part.sourceUrl,new RegExp(`docid=${document}`));}
    for(const part of meeting.parts.filter(part=>!part.programmeTime))assert.equal(part.durationMinutes,0);
  }
  assert.equal(ids.size,3);assert.throws(()=>conventionMeeting(convention,'2026-07-23'),/within/);
});

test('overlapping visits, assemblies and conventions are rejected explicitly in every direction',()=>{
  const storage=memory(),visit={...emptyVisit,enabled:true};
  saveCircuitVisit(co.date,visit,storage);
  assert.throws(()=>saveCircuitAssembly(co,storage),/visit/);
  saveCircuitVisit(co.date,emptyVisit,storage);saveCircuitAssembly(co,storage);
  assert.throws(()=>saveCircuitVisit(co.date,visit,storage),/assembly/);
  assert.throws(()=>saveConvention({date:'2026-11-20',programme:'2026'},storage),/assembly/);
  removeCircuitAssembly(co.date,storage);saveConvention({date:'2026-11-20',programme:'2026'},storage);
  assert.throws(()=>saveCircuitAssembly(co,storage),/convention/);
  assert.throws(()=>saveCircuitVisit(co.date,visit,storage),/convention/);
  removeConvention(co.date,storage);saveCircuitVisit(co.date,visit,storage);
  assert.throws(()=>saveConvention({date:'2026-11-20',programme:'2026'},storage),/visit/);
});

test('event programmes translate every non-song title and listening prompt without changing notebook IDs',()=>{
  const programmes=[assemblyMeeting(co),assemblyMeeting(branch),...conventionDates(convention.date).map(date=>conventionMeeting(convention,date))];
  for(const meeting of programmes){
    const spanish=localizeMeeting(meeting,'es');
    assert.equal(spanish.id,meeting.id);
    assert.notEqual(spanish.theme,meeting.theme);
    assert.match(spanish.material.appUrl,/wtlocale=S/);
    for(let i=0;i<meeting.parts.length;i++){
      const source=meeting.parts[i],part=spanish.parts[i];
      assert.equal(part.id,source.id);
      assert.notEqual(part.title,source.title,`Missing title: ${source.title}`);
      assert.notEqual(part.summary,source.summary,`Missing summary: ${source.summary}`);
      if(part.question)assert.notEqual(part.question,source.question);
    }
  }
});

test('missing, expired and invalid special-event choices revert to the automatic schedule',()=>{
  const storage=memory();
  for(const override of [{type:'assembly',date:co.date,chosenOn:'2026-10-27'},{type:'convention',date:convention.date,chosenOn:'2026-10-27'},null]){
    assert.deepEqual(resolveJourney('2026-10-27',days,override,storage),{type:'midweek',date:'2026-10-28'});
  }
  saveCircuitAssembly(co,storage);
  assert.deepEqual(resolveJourney('2026-10-27',days,{type:'assembly',date:co.date,chosenOn:'2026-10-26'},storage),{type:'midweek',date:'2026-10-28'});
});

test('changing dates between saved event types follows the new date rather than the previous meeting type',()=>{
  const storage=memory();
  saveCircuitAssembly(co,storage);saveConvention(convention,storage);
  assert.deepEqual(resolveJourney('2026-10-27',days,{type:'assembly',date:convention.date,chosenOn:'2026-10-27'},storage),{type:'convention',date:convention.date});
  assert.deepEqual(resolveJourney('2026-10-27',days,{type:'convention',date:co.date,chosenOn:'2026-10-27'},storage),{type:'assembly',date:co.date});
});
