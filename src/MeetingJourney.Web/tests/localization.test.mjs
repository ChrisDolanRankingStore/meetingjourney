import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {preferredLanguage,t,officialUrl} from '../src/i18n.ts';
import {lookupSong,songNumberFromTitle} from '../src/songs.ts';
import {personalizeMeeting,saveLocalTitle,saveSongDetails} from '../src/localMeetingDetails.ts';
import {getMeeting} from '../../../node-app/meeting-catalog.js';
import {buildDiscoveryTreasures} from '../src/discoveryBook.ts';
import {validateBackup} from '../src/journalBackup.ts';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};

test('a saved language wins; Spanish device locales select Spanish on first use',()=>{
 assert.equal(preferredLanguage(null,['es-MX','en-GB']),'es');
 assert.equal(preferredLanguage('en',['es-ES']),'en');
 assert.equal(preferredLanguage('es',['en-GB']),'es');
 assert.equal(preferredLanguage('bad',['en-GB']),'en');
 assert.equal(t('Draw',undefined,'es'),'Dibujar');
 assert.equal(t('Draw',undefined,'en'),'Draw');
 assert.equal(t('Stop {v0}: {v1}{v2}',{v0:2,v1:'Mi idea',v2:''},'es'),'Parada 2: Mi idea');
});

test('the number resolves official titles in each language without translating the English title',()=>{
 assert.equal(lookupSong('021','en').title,'Keep On Seeking First the Kingdom');
 assert.equal(lookupSong(21,'es').title,'Busquemos primero el Reino');
 assert.equal(lookupSong(106,'es').title,'Cultivemos amor verdadero');
 assert.notEqual(lookupSong(106,'en').title,lookupSong(106,'es').title);
 for(const input of ['0','-1','1.5','1e2','999',''])assert.equal(lookupSong(input,'es'),undefined);
 assert.equal(songNumberFromTitle('Song 106 and prayer'),106);
 assert.equal(songNumberFromTitle('Canción 106 - Cultivemos amor verdadero'),106);
});

test('both catalogues contain 164 matching numbered entries with official language-specific links',()=>{
 const data=JSON.parse(readFileSync(new URL('../src/data/songCatalog.json',import.meta.url),'utf8'));
 assert.equal(Object.keys(data.songs.en).length,164);
 assert.deepEqual(Object.keys(data.songs.en),Object.keys(data.songs.es));
 for(const language of ['en','es'])for(const [number,song]of Object.entries(data.songs[language])){
  assert.ok(song.title.trim());assert.equal(new URL(song.url).hostname,'www.jw.org');
  assert.ok(new URL(song.url).pathname.startsWith('/'+language+'/'));
  assert.ok(new URL(song.url).pathname.includes(language === 'es' ? '/cantemos-con-gozo/' : '/sing-out-joyfully/'));
 }
});

test('an automatic saved song changes language while keeping IDs, place keys, notes and drawing association',()=>{
 const device=storage(),meeting=getMeeting('weekend','2026-10-25');
 saveSongDetails(meeting.id,'opening-song','21','',device,{automaticTitle:true});
 const en=personalizeMeeting(meeting,device,'en'),es=personalizeMeeting(meeting,device,'es');
 assert.match(en.parts[0].title,/Keep On Seeking First the Kingdom/);
 assert.equal(es.parts[0].title,'Canción 21 - Busquemos primero el Reino');
 assert.deepEqual(es.parts.map(part=>part.id),en.parts.map(part=>part.id));
 assert.equal(es.id,meeting.id);assert.equal(es.parts[0].type,'Song');
 assert.equal(new URL(es.parts[0].appUrl).searchParams.get('wtlocale'),'S');
 assert.equal(es.parts[0].appUrl,lookupSong(21,'es').appUrl);
 assert.equal(new URL(es.parts[0].sourceUrl).pathname.startsWith('/es/'),true);
 assert.equal(personalizeMeeting(getMeeting('weekend','2026-11-01'),device,'es').parts[0].songNumber,undefined);
 const note={meetingId:meeting.id,partId:'opening-song',text:'My words must stay exactly as I wrote them.'};
 const result=buildDiscoveryTreasures(es,[note],[]);
 assert.equal(result[0].part.title,es.parts[0].title);assert.equal(result[0].note.text,note.text);
});

test('custom song titles and talk titles are preserved verbatim when language changes',()=>{
 const device=storage(),meeting=getMeeting('weekend','2026-10-25');
 saveSongDetails(meeting.id,'opening-song','21','My personal name for this song',device,{automaticTitle:false});
 saveLocalTitle(meeting.id,'public-talk','Our local talk title',device);
 const es=personalizeMeeting(meeting,device,'es');
 assert.equal(es.parts[0].title,'Canción 21 - My personal name for this song');
 assert.equal(es.parts[1].title,'Our local talk title');
});

test('Spanish headings, study cues and official links accompany the same reviewed programme',()=>{
 const meeting=personalizeMeeting(getMeeting('weekend','2026-10-25'),storage(),'es');
 assert.equal(meeting.theme,'Reunión del fin de semana');
 assert.equal(meeting.parts[1].title,'Discurso público');
 const study=meeting.parts.find(part=>part.type==='WatchtowerStudy');
 assert.equal(study.title,'Un ruego apelando al amor');
 assert.match(study.studyGuide.cues[0].prompt,/Fíjate/);
 assert.equal(new URL(study.appUrl).searchParams.get('wtlocale'),'S');
 assert.equal(new URL(study.appUrl).searchParams.get('docid'),'2026522');
 assert.equal(officialUrl('https://example.com/user-link','es'),'https://example.com/user-link');
 const midweek=personalizeMeeting(getMeeting('midweek','2026-10-26'),storage(),'es');
 assert.match(midweek.parts[0].title,/^Canción 125 - /);
 assert.equal(midweek.parts[0].type,'Song');
});

test('a journal backup accepts language and automatic song preferences without needing a server',()=>{
 const device=storage();saveSongDetails('weekend-2026-10-19','opening-song','21','',device,{automaticTitle:true});
 const backup=validateBackup({format:'meeting-journey',version:1,exportedAt:new Date().toISOString(),notes:[],drawings:[],engagement:[],preferences:{'mj-language':'es','mj-part-titles:weekend-2026-10-19':device.getItem('mj-part-titles:weekend-2026-10-19')}});
 assert.equal(backup.preferences['mj-language'],'es');
 assert.equal(JSON.parse(backup.preferences['mj-part-titles:weekend-2026-10-19'])['opening-song'].titleMode,'catalogue');
});
