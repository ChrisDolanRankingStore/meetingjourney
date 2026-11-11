import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openAdminStore} from '../../../node-app/admin-store.js';
import {artworkConcept,artworkStyles} from '../../../node-app/artwork-concepts.js';
import {artworkLookahead,createArtworkPlanner,generateArtworkConcepts,readPlannerConfig} from '../../../node-app/artwork-planner.js';

const config={key:'not-a-real-api-key-for-tests',model:'gemini-3.1-flash-lite'};
const subjects=week=>['midweek','weekend'].map(kind=>({
  meetingId:`${kind==='midweek'?'meeting':'weekend'}-${week}`,weekOf:week,kind,
  partId:kind==='midweek'?'part-1':'watchtower-study',title:kind==='midweek'?'Showing patience':'Showing gratitude',
  reference:'Test 1:1',context:'Public programme metadata',sourceUrl:'https://www.jw.org/finder?docid=123',
  sourceStatus:'discovered',automatable:true
}));
const suggestions=()=>artworkStyles.map((style,index)=>({style,safeTheme:'Showing patience',scene:`A calm person tending ${index+1} small plants.`}));
const generated=item=>({needsReview:false,concepts:suggestions().map(input=>artworkConcept({...input,meetingId:item.meetingId,partId:item.partId},[item]))});
function fixture(){
  const directory=mkdtempSync(join(tmpdir(),'mj-planner-')),publicDir=join(directory,'public');mkdirSync(publicDir);
  let store=openAdminStore(join(directory,'private'),publicDir);
  return {database:()=>store,reopen:()=>{store.close();store=openAdminStore(join(directory,'private'),publicDir);},
    close:()=>{store.close();rmSync(directory,{recursive:true,force:true});}};
}
test('four-week lookahead is calendar-week based across Sundays and year boundaries',()=>{
  assert.deepEqual(artworkLookahead('2026-11-10'),['2026-11-16','2026-11-23','2026-11-30','2026-12-07']);
  assert.deepEqual(artworkLookahead('2026-11-15'),artworkLookahead('2026-11-10'));
  assert.deepEqual(artworkLookahead('2027-01-01'),['2027-01-04','2027-01-11','2027-01-18','2027-01-25']);
  assert.throws(()=>artworkLookahead('2026-02-30'));
  assert.equal(readPlannerConfig({}),null);
  assert.throws(()=>readPlannerConfig({MJ_ARTWORK_AUTOMATION_ENABLED:'true'}));
  assert.throws(()=>readPlannerConfig({MJ_ARTWORK_AUTOMATION_ENABLED:'true',MJ_GEMINI_API_KEY:config.key,MJ_GEMINI_MODEL:'https://untrusted.example'}));
  assert.throws(()=>readPlannerConfig({MJ_ARTWORK_AUTOMATION_ENABLED:'true',MJ_GEMINI_API_KEY:config.key,MJ_GEMINI_MODEL:'gemini-3.1-flash-image'}));
});
test('Gemini requests source-linked scene variants while keeping safety exclusions out of image prompts',async()=>{
  const item={...subjects('2026-12-07')[0],sourceHash:'test-hash',notebook:'PRIVATE NOTE MUST NEVER BE SENT'};
  const reply=output=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]}));
  let request;
  const result=await generateArtworkConcepts(item,config,{fetcher:async(url,options)=>{
    request={url,options,body:JSON.parse(options.body)};
    return reply({needsReview:false,reason:'',concepts:suggestions()});
  }});
  assert.equal(result.concepts.length,3);
  assert.equal(request.options.headers['x-goog-api-key'],config.key);
  assert.equal(request.options.redirect,'error');
  assert.equal(request.body.generationConfig.responseMimeType,'application/json');
  assert.doesNotMatch(request.options.body,/PRIVATE NOTE|not-a-real-api-key/);
  const instructions=request.body.systemInstruction.parts[0].text;
  assert.match(instructions,/same supported scene and theme/);
  assert.match(instructions,/Never replace the subject with an unrelated everyday analogy/);
  assert.match(instructions,/does not support a clear, child-appropriate Bible scene, set needsReview=true/);
  assert.match(instructions,/No sexual content/);
  assert.equal(request.body.safetySettings.length,4);
  for(const entry of result.concepts){
    assert.equal(entry.state,'draft');assert.equal(entry.conceptApproval,null);assert.equal(entry.imageApproval,null);
    assert.match(entry.prompt,/fully clothed characters/);
    assert.ok(entry.prompt.includes(`Theme: ${entry.safeTheme}\nScene: ${entry.scene}\n`));
    assert.doesNotMatch(entry.prompt,/sexual|nudity|requires administrator approval|Do not depict|Do not copy/);
  }
  for(const output of [
    {needsReview:false,reason:'',concepts:suggestions().slice(0,2)},
    {needsReview:false,reason:'',concepts:[suggestions()[0],suggestions()[0],suggestions()[0]]},
    {needsReview:false,reason:'',concepts:suggestions().map(entry=>({...entry,scene:'x'.repeat(1501)}))},
    {needsReview:true,reason:'Ambiguous source',concepts:suggestions()}
  ])await assert.rejects(generateArtworkConcepts(item,config,{fetcher:async()=>reply(output)}));
  await assert.rejects(generateArtworkConcepts(item,config,{fetcher:async()=>new Response(JSON.stringify({candidates:[{finishReason:'SAFETY'}]}))}),/blocked/);
  await assert.rejects(generateArtworkConcepts(item,config,{fetcher:async()=>new Response(config.key,{status:429})}),
    error=>/HTTP 429/.test(error.message)&&!error.message.includes(config.key));
  const review=await generateArtworkConcepts(item,config,{fetcher:async()=>reply({needsReview:true,reason:'Insufficient context',concepts:[]})});
  assert.equal(review.needsReview,true);assert.equal(review.concepts.length,0);
});
test('planning catches up four future weeks, survives restarts and never overwrites reviewed work',async()=>{
  const f=fixture();let calls=0,discoveryCalls=0,changed=false;
  const options={config,database:f.database,reviewedItems:()=>[],now:()=>new Date('2026-11-10T12:00:00Z'),
    discover:async week=>{
      discoveryCalls++;const found=subjects(week);
      if(changed&&week==='2026-12-07')found[0].title='Updated Treasures theme';
      return {subjects:found,missing:[]};
    },generate:async item=>{calls++;return generated(item);}};
  try{
    const planner=createArtworkPlanner(options),result=await planner.run();
    assert.equal(result.generated,24);assert.equal(calls,8);assert.equal(discoveryCalls,4);
    const draft=f.database().list()[0];
    f.database().update(draft.id,draft.revision,'test-admin','approve-concept',entry=>({
      ...entry,data:{...entry.data,state:'concept-approved',conceptApproval:{actor:'test-admin',promptHash:'reviewed'}}}));
    await planner.run();
    assert.equal(calls,8);assert.equal(discoveryCalls,4);
    f.reopen();
    const restarted=createArtworkPlanner(options);
    await restarted.run({force:true});
    assert.equal(calls,8);
    assert.equal(f.database().get(draft.id).data.state,'concept-approved');
    assert.equal(f.database().audit(draft.id).at(-1).action,'generate-concept');
    changed=true;
    await restarted.run({force:true});
    assert.equal(calls,9);assert.equal(f.database().list().length,27);
    assert.equal(f.database().get(draft.id).data.state,'concept-approved');
    assert.equal(f.database().sources().find(item=>item.weekOf==='2026-12-07'&&item.kind==='midweek').title,'Updated Treasures theme');
  }finally{f.close();}
});
test('persistent leases and daily call caps bound concurrent runs and retries',async()=>{
  const f=fixture();let release,calls=0,revision=0;
  const options={config,database:f.database,reviewedItems:()=>[],now:()=>new Date('2026-11-10T12:00:00Z'),
    discover:async week=>({subjects:subjects(week).map(item=>({...item,title:`${item.title} ${revision}`})),missing:[]}),
    generate:async item=>{calls++;if(calls===1)await new Promise(resolve=>{release=resolve;});return generated(item);}};
  try{
    const planner=createArtworkPlanner(options),running=planner.run();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(planner.status().running,true);
    await createArtworkPlanner(options).run({force:true});
    assert.equal(calls,1);
    release();await running;
    revision++;const capped=await planner.run({force:true});
    assert.equal(calls,12);assert.equal(capped.callsToday,12);assert.match(capped.issues[0].message,/cap reached/);
    f.reopen();
    await createArtworkPlanner(options).run({force:true});
    assert.equal(calls,12);
  }finally{f.close();}
});
test('missing publications and ambiguous concepts stay visible without guessed drafts or repeat AI spending',async t=>{
  t.mock.method(console,'error',()=>{});
  const f=fixture();let calls=0,date=new Date('2026-11-10T12:00:00Z');
  try{
    const planner=createArtworkPlanner({config,database:f.database,reviewedItems:()=>[],now:()=>date,
      discover:async week=>{
        if(week==='2026-12-07')throw Error('wrong week');
        return {subjects:subjects(week).slice(0,1),missing:['weekend']};
      },
      generate:async item=>{
        calls++;
        if(calls===1)return generateArtworkConcepts(item,config,{fetcher:async()=>new Response(JSON.stringify({candidates:[{finishReason:'SAFETY'}]}))});
        return {needsReview:true,reason:'Insufficient context',concepts:[]};
      }
    });
    const result=await planner.run();
    assert.equal(calls,3);assert.equal(f.database().list().length,0);
    assert.ok(result.issues.some(issue=>issue.week==='2026-12-07'&&/date-validated/.test(issue.message)));
    assert.ok(result.issues.some(issue=>/not published yet/.test(issue.message)));
    date=new Date('2026-11-11T13:00:00Z');
    const next=await planner.run();
    assert.equal(calls,3);assert.ok(next.issues.some(issue=>/Insufficient context/.test(issue.message)));
  }finally{f.close();}
});
