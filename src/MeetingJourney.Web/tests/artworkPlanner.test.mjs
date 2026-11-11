import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openAdminStore} from '../../../node-app/admin-store.js';
import {artworkConcept,artworkStyles} from '../../../node-app/artwork-concepts.js';
import {artworkLookahead,createArtworkPlanner,defaultArtworkInstructions,generateArtworkConcepts,readPlannerConfig} from '../../../node-app/artwork-planner.js';

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
  assert.match(instructions,/false god/);
  assert.match(instructions,/sun, moon, stars, plants/);
  assert.equal(request.body.safetySettings.length,4);
  for(const entry of result.concepts){
    assert.equal(entry.state,'draft');assert.equal(entry.conceptApproval,null);assert.equal(entry.imageApproval,null);
    assert.match(entry.prompt,/fully clothed characters/);
    assert.ok(entry.prompt.includes(`Theme: ${entry.safeTheme}\nScene: ${entry.scene}\n`));
    assert.doesNotMatch(entry.prompt,/sexual|nudity|requires administrator approval|Do not copy/);
    assert.match(entry.prompt,/false god.*sun, plants/);
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
  const editedInstructions=instructions+'\nKeep all plants natural.';
  await generateArtworkConcepts(item,{...config,instructions:editedInstructions},{fetcher:async(url,options)=>{
    assert.equal(JSON.parse(options.body).systemInstruction.parts[0].text,editedInstructions);
    return reply({needsReview:true,reason:'Insufficient context',concepts:[]});
  }});
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
test('explicit regeneration replaces only older unapproved Gemini drafts without duplicating or rewriting approved artwork',async()=>{
  const f=fixture();let calls=0,date=new Date('2026-11-10T12:00:00Z');
  const options={config,database:f.database,reviewedItems:()=>[],now:()=>date,
    discover:async week=>({subjects:subjects(week),missing:[]}),
    generate:async item=>{calls++;return generated(item);}};
  try{
    await createArtworkPlanner(options).run();
    const drafts=f.database().list();
    for(const draft of drafts)f.database().update(draft.id,draft.revision,'fixture','old-instructions',entry=>{
      const {promptVersion,...generation}=entry.data.generation;
      return {...entry,data:{...entry.data,safeTheme:'Old generic theme',scene:'Old unrelated garden',generation}};
    });
    const protectedStates=['published','image-ready','concept-approved','rejected'],protectedEntries=[];
    for(const [index,state] of protectedStates.entries()){
      const current=f.database().get(drafts[index*3].id);
      f.database().update(current.data.id,current.data.revision,'fixture','review',entry=>({
        data:{...entry.data,state,conceptApproval:state==='rejected'?null:{promptHash:'approved-prompt'},
          imageHash:['published','image-ready'].includes(state)?'approved-image':null},
        image:['published','image-ready'].includes(state)?Buffer.from('existing approved image'):null
      }));
      protectedEntries.push(f.database().get(current.data.id));
    }
    const manual=f.database().create(generated({...subjects('2026-11-16')[0],sourceHash:'manual-source'}).concepts[0],'administrator');
    const planner=createArtworkPlanner(options);
    const normal=await planner.run({force:true});
    assert.equal(calls,8,'Normal checks must not replay old batches.');
    const capped=await planner.run({force:true,regenerateDrafts:true});
    assert.equal(calls,12);assert.equal(capped.callsToday,12);
    assert.match(capped.issues[0].message,/Run draft regeneration again on another UTC day/);
    date=new Date('2026-11-11T13:00:00Z');
    const result=await planner.run({force:true,regenerateDrafts:true});
    assert.equal(capped.regenerated+result.regenerated,20);assert.equal(calls,16);
    assert.equal(result.nextCheckAt,normal.nextCheckAt,'Refreshing drafts must not postpone the normal daily check.');
    assert.equal(f.database().list().length,25,'Regeneration updates existing IDs rather than adding duplicate entries.');
    for(const entry of protectedEntries)assert.deepEqual(f.database().get(entry.data.id),entry);
    assert.deepEqual(f.database().get(manual.id).data,manual);
    const refreshed=f.database().list().find(entry=>entry.generation?.promptVersion!==undefined);
    assert.equal(refreshed.safeTheme,'Showing patience');
    assert.equal(refreshed.revision,3);
    assert.equal(f.database().audit(refreshed.id)[0].action,'regenerate-concept');
    f.reopen();
    await createArtworkPlanner(options).run({force:true,regenerateDrafts:true});
    assert.equal(calls,16,'Already refreshed drafts must not be billed again.');
  }finally{f.close();}
});
test('saved instructions persist without generating and permit retry after clarification',async()=>{
  const f=fixture(),item={...subjects('2026-12-07')[0],sourceHash:'fixture-hash'};
  let calls=0;
  const received=[];
  try{
    const clarified=defaultArtworkInstructions+'\nUse the supplied account of comfort, not an analogy.';
    f.database().savePlannerInstructions(clarified,0,'administrator');
    assert.throws(()=>f.database().savePlannerInstructions('stale',0,'other-admin'),/changed/);
    f.reopen();
    assert.equal(f.database().plannerInstructions().instructions,clarified);
    const planner=createArtworkPlanner({config,database:f.database,reviewedItems:()=>[item],
      now:()=>new Date('2026-11-10T12:00:00Z'),discover:async()=>({subjects:[],missing:[]}),
      generate:async(subject,runConfig)=>{
        calls++;received.push(runConfig.instructions);
        return calls===1?{needsReview:true,reason:'Clarify the supported moment.',concepts:[]}:generated(subject);
      }
    });
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(calls,0,'Creating a planner and saving instructions must not spend quota.');
    await planner.run({force:true});
    await planner.run({force:true});
    assert.equal(calls,1,'Unchanged instructions must not repeat a manual-review request.');
    f.database().savePlannerInstructions(clarified+'\nShow the moment after the help arrives.',1,'administrator');
    await planner.run({force:true});
    assert.equal(calls,2);
    assert.equal(received[1],f.database().plannerInstructions().instructions);
    assert.equal(f.database().list().length,3);
    f.database().savePlannerInstructions(clarified,2,'administrator');
    await planner.run({force:true,regenerateDrafts:true});
    assert.equal(calls,3,'Changed instructions make unapproved drafts eligible for an explicit rerun.');
    assert.equal(f.database().list().length,3);
    assert.ok(f.database().list().every(entry=>entry.prompt.includes('false god')));
  }finally{f.close();}
});
test('regeneration rolls back a subject if a draft is approved while Gemini is working',async()=>{
  const f=fixture(),item={...subjects('2026-12-07')[0],sourceHash:'fixture-hash'};
  try{
    f.database().createPlanned('old-batch',generated(item).concepts.map(concept=>({...concept,generation:{provider:'gemini'}})));
    const drafts=f.database().list(),concurrent=drafts[1];
    let reviewed;
    const result=await createArtworkPlanner({config,database:f.database,reviewedItems:()=>[item],
      now:()=>new Date('2026-11-10T12:00:00Z'),discover:async()=>({subjects:[],missing:[]}),
      generate:async()=>{
        reviewed=f.database().update(concurrent.id,concurrent.revision,'administrator','approve-concept',entry=>({
          ...entry,data:{...entry.data,state:'concept-approved',conceptApproval:{promptHash:'reviewed'}}}));
        return generated(item);
      }
    }).run({force:true,regenerateDrafts:true});
    assert.equal(result.regenerated,0);assert.match(result.issues[0].message,/draft changed/i);
    assert.deepEqual(f.database().get(concurrent.id).data,reviewed);
    for(const draft of drafts.filter(draft=>draft.id!==concurrent.id)){
      assert.deepEqual(f.database().get(draft.id).data,draft);
      assert.equal(f.database().audit(draft.id).length,1,'Partial regeneration and its audit must roll back together.');
    }
  }finally{f.close();}
});
test('regeneration leaves drafts intact when source context is insufficient and does not repeatedly bill for it',async()=>{
  const f=fixture(),item={...subjects('2026-12-07')[0],sourceHash:'fixture-hash'};
  let calls=0;
  try{
    f.database().createPlanned('old-batch',generated(item).concepts.map(concept=>({...concept,generation:{provider:'gemini'}})));
    const original=f.database().list();
    const planner=createArtworkPlanner({config,database:f.database,reviewedItems:()=>[item],
      now:()=>new Date('2026-11-10T12:00:00Z'),discover:async()=>({subjects:[],missing:[]}),
      generate:async()=>{calls++;return {needsReview:true,reason:'The source does not identify a Bible scene.',concepts:[]};}
    });
    for(let attempt=0;attempt<2;attempt++){
      const result=await planner.run({force:true,regenerateDrafts:true});
      assert.equal(result.regenerated,0);assert.match(result.issues[0].message,/does not identify a Bible scene/);
      assert.deepEqual(f.database().list(),original);
    }
    assert.equal(calls,1);
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
