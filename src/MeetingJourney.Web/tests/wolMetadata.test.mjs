import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wolWeekUrl,parseWorkbookMetadata,parseStudyMetadata,studyParagraphCount,loadWolMeeting} from '../../../node-app/wol-metadata.js';
import {localizeMeeting} from '../src/meetingLocale.ts';

const workbook=language=>`<article id="article"><header><h2><a href="/${language}/wol/bc/r1/lp-e/555/0/0">Test reading 1-2</a></h2></header>
<h3 data-pid="3">Song 1 and Prayer | Opening Comments (1 min.)</h3>
<h2 class="teal">Section</h2>
${[1,2,3].map(number=>`<h3 data-pid="${number+3}">${number}. ${language} item ${number}</h3><p>(${number===3?4:10} min.) NEVER COPY THIS PARAGRAPH <a href="/${language}/wol/bc/r1/lp-e/555/${number}/0">Test 1:${number}</a></p>`).join('')}
<h2 class="gold">Section</h2><h3 data-pid="9">4. ${language} conversation</h3><p>(3 min.) <a href="/${language}/wol/pc/r1/lp-e/555/1/0">Guide lesson 2</a></p>
<h2 class="maroon">Section</h2><h3 data-pid="10">Song 2</h3>
<h3 data-pid="11">5. Congregation Bible Study</h3><p>(30 min.) <a href="https://evil.example/pc/test">unsafe source</a></p>
<h3 data-pid="12">Concluding Comments (3 min.) | Song 3 and Prayer</h3></article>`;
const study='<article id="article"><header><h1>A test study title</h1><p>SONG 4</p><p><a href="/en/wol/bc/r1/lp-e/556/0/0">Test 2:3</a></p></header><p>NEVER COPY THIS PARAGRAPH</p></article>';
function source(date,seen){
 return async url=>{
  seen.push(url);
  const language=url.includes('/es/')?'es':'en';
  return new Response(url.includes('/meetings/')?`<input id="todayDate" value="${date.replaceAll('-','/')}"><li class="todayItem pub-mwb docId-555"></li><li class="todayItem pub-w docId-556"></li>`:url.endsWith('/555')?workbook(language):study);
 };
}
test('WOL links use ISO week years at calendar-year boundaries',()=>{
 assert.equal(wolWeekUrl('2026-11-08'),'https://wol.jw.org/en/wol/meetings/r1/lp-e/2026/45');
 assert.equal(wolWeekUrl('2027-01-01','es'),'https://wol.jw.org/es/wol/meetings/r4/lp-s/2026/53');
 assert.equal(wolWeekUrl('2024-12-30'),'https://wol.jw.org/en/wol/meetings/r1/lp-e/2025/1');
 assert.throws(()=>wolWeekUrl('2026-02-30'));
 assert.throws(()=>wolWeekUrl('2026-11-02','xx'));
});
test('workbook import retains only headings, timings and official reference metadata',()=>{
 const metadata=parseWorkbookMetadata(workbook('en'),'en');
 assert.equal(metadata.parts.length,10);
 assert.equal(metadata.parts.find(part=>part.id==='part-4').section,'FieldMinistry');
 assert.equal(metadata.parts.find(part=>part.id==='part-5').type,'CongregationBibleStudy');
 assert.equal(metadata.parts.find(part=>part.id==='part-1').references[0].label,'Test 1:1');
 assert.doesNotMatch(JSON.stringify(metadata),/NEVER COPY|unsafe source|evil\.example/);
 assert.throws(()=>parseWorkbookMetadata(workbook('en').replace('5. Congregation Bible Study','8. Congregation Bible Study'),'en'));
 assert.throws(()=>parseWorkbookMetadata('<html>Unavailable</html>','en'));
});
test('study import excludes paragraphs and requires a real song and title',()=>{
 assert.deepEqual(parseStudyMetadata(study,'en'),{title:'A test study title',songNumber:4,references:[{label:'Test 2:3',url:'https://wol.jw.org/en/wol/bc/r1/lp-e/556/0/0'}]});
 assert.throws(()=>parseStudyMetadata(study.replace('SONG 4','No song'),'en'));
});
test('study paragraph totals use numbered prose or wcg prose, not review question counts',()=>{
 assert.equal(studyParagraphCount('<article id="article"><p data-pid="1">1 First</p><p data-pid="2">2 Second</p></article>'),2);
 assert.equal(studyParagraphCount('<article id="article"><div id="tt4"><p data-pid="3">Prose</p><p data-pid="4">More prose</p><h3>Questions</h3><p data-pid="8">1. Question</p></div></article>'),2);
 assert.equal(studyParagraphCount('<article id="article"><p>Not a known structure</p></article>'),undefined);
});
test('automatic metadata preserves notebook IDs, translates titles and caches bilingual requests',async()=>{
 const seen=[],fetcher=source('2026-11-02',seen);
 const [meeting,duplicate]=await Promise.all([loadWolMeeting('midweek','2026-11-02',{fetcher}),loadWolMeeting('midweek','2026-11-02',{fetcher})]);
 assert.strictEqual(meeting,duplicate);
 assert.equal(seen.length,10);
 assert.equal(meeting.contentStatus,'dated');
 for(const id of ['ministry','study','part-1','opening-song','closing-song'])assert.ok(meeting.parts.some(part=>part.id===id));
 assert.equal(new Set(meeting.parts.map(part=>part.id)).size,meeting.parts.length);
 assert.equal(localizeMeeting(meeting,'es').parts.find(part=>part.id==='part-1').title,'es item 1');
 assert.equal(localizeMeeting(meeting,'en').parts.find(part=>part.id==='part-1').title,'en item 1');
 assert.ok(meeting.parts.every(part=>!part.connections&&!part.studyGuide));
 assert.doesNotMatch(JSON.stringify(meeting),/NEVER COPY THIS PARAGRAPH/);
 await loadWolMeeting('midweek','2026-11-02',{fetcher});
 assert.equal(seen.length,10);
});
test('weekend metadata leaves the local public talk and opening/closing songs untouched',async()=>{
 const meeting=await loadWolMeeting('weekend','2026-11-09',{fetcher:source('2026-11-09',[])});
 assert.equal(meeting.contentStatus,'dated');
 assert.equal(meeting.parts.find(part=>part.id==='public-talk').title,'Public talk');
 assert.equal(meeting.parts.find(part=>part.id==='watchtower-study').title,'A test study title');
 assert.equal(meeting.parts.find(part=>part.id==='study-song').songNumber,4);
 assert.equal(meeting.parts.find(part=>part.id==='opening-song').songNumber,undefined);
 assert.equal(meeting.parts.find(part=>part.id==='closing-song').songNumber,undefined);
});
test('wrong-week and unavailable metadata are explicit, rate limited and never relabelled',async t=>{
 const errors=[];
 t.mock.method(console,'error',(...values)=>errors.push(values));
 let calls=0;
 const options={fetcher:async()=>{calls++;return new Response('<input id="todayDate" value="2026/10/19">');}};
 const meeting=await loadWolMeeting('midweek','2026-11-16',options);
 assert.equal(meeting.contentStatus,'general');
 assert.match(meeting.contentNotice,/could not be loaded/);
 assert.equal(meeting.weekOf,'2026-11-16');
 await loadWolMeeting('midweek','2026-11-16',options);
 assert.equal(calls,1);
 assert.equal(errors.length,1);
});
test('an update failure retains the last complete programme and signals stale content',async t=>{
 t.mock.method(console,'error',()=>{});
 const first=await loadWolMeeting('midweek','2026-11-23',{fetcher:source('2026-11-23',[]),now:()=>0});
 const stale=await loadWolMeeting('midweek','2026-11-23',{fetcher:async()=>new Response('Unavailable',{status:503}),now:()=>25*60*60*1000});
 assert.equal(first.contentStatus,'dated');
 assert.deepEqual(stale.parts,first.parts);
 assert.match(stale.contentNotice,/last saved programme/);
});
