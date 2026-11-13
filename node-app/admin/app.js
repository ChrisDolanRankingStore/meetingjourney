const $=selector=>document.querySelector(selector);
const form=$('#concept'),review=$('#review'),status=$('#status');
let items=[],entries=[],selected=null,planner=null,plannerTimer,planningInstructions=null;
let editingItem=null,editingStyle='simple';
function message(text){status.textContent=text;}
async function api(path,options={}){
  const response=await fetch(path,{...options,cache:'no-store',credentials:'same-origin',headers:{'X-MJ-Admin':'1',...options.headers}});
  if(!response.ok){
    const type=response.headers.get('content-type')??'';
    const error=type.includes('application/json')?(await response.json()).error:'Administrator sign-in could not be verified. Reload the protected admin address.';
    throw Error(error??`Request failed (${response.status}).`);
  }
  return response.json();
}
async function run(operation){
  const buttons=[...document.querySelectorAll('button,input,select,textarea')];
  const previous=buttons.map(button=>button.disabled);
  buttons.forEach(button=>button.disabled=true);
  try{await operation();}
  catch(error){message(error.message);}
  finally{buttons.forEach((button,index)=>button.disabled=previous[index]);applyState();}
}
function applyState(){
  const unsaved=!planningInstructions||$('#planning-text').value!==planningInstructions.instructions;
  $('#plan-now').disabled=!planner?.enabled||planner.running||unsaved;
  $('#plan-regenerate').disabled=!planner?.enabled||planner.running||unsaved;
  $('#plan-retry').disabled=!planner?.enabled||planner.running||unsaved;
  const state=selected?.state;
  $('#approve-concept').hidden=state!=='draft';
  $('#upload').hidden=!selected?.conceptApproval;
  $('#approve-image').hidden=state!=='image-ready';
  $('#publish').hidden=state!=='approved';
  $('#withdraw').hidden=!selected||state==='rejected';
}
const sameItem=(left,right)=>left&&right&&left.meetingId===right.meetingId&&left.partId===right.partId;
function choose(entry,item=entry?items.find(item=>sameItem(item,entry)):items[0],style=entry?.style??'simple'){
  if(entry&&!item)throw Error('This artwork source is unavailable. Refresh the queue before editing it.');
  selected=entry;
  editingItem=item;editingStyle=style;
  form.elements.meetingItem.value=String(items.indexOf(item));
  form.elements.style.value=style;
  form.elements.safeTheme.value=entry?.safeTheme??'';
  form.elements.scene.value=entry?.scene??'';
  $('#editor-title').textContent=entry?`Review: ${entry.partTitle}`:'New safe concept';
  review.hidden=!entry;
  $('#safe').checked=false;$('#accurate').checked=false;
  $('#upload').reset();
  $('#prompt').value=entry?.prompt??'';
  $('#state').textContent=entry?`${entry.state} - revision ${entry.revision}${entry.generation?` - ${entry.generation.provider} suggestion (human review required)`:''}`:'';
  $('#preview').hidden=!entry?.imageHash;
  if(entry?.imageHash)$('#preview').src=`/api/admin/artwork/${entry.id}/image?revision=${entry.revision}`;
  else $('#preview').removeAttribute('src');
  $('#audit').replaceChildren();showSource();applyState();
  const versions=entries.filter(candidate=>sameItem(candidate,item)&&candidate.style===style);
  $('#saved-version').replaceChildren();
  for(const candidate of versions){
    const option=document.createElement('option');option.value=candidate.id;
    option.textContent=`${candidate.state} - revision ${candidate.revision} (${candidate.id.slice(0,8)})`;
    $('#saved-version').append(option);
  }
  $('#saved-version-field').hidden=versions.length<2||!entry;
  if(entry)$('#saved-version').value=entry.id;
}
function hasConceptEdits(){
  return form.elements.safeTheme.value!==(selected?.safeTheme??'')||form.elements.scene.value!==(selected?.scene??'');
}
function allowSelectionChange(){
  if(!hasConceptEdits()||confirm('Discard unsaved concept edits and open the other selection?'))return true;
  form.elements.meetingItem.value=String(items.indexOf(editingItem));
  form.elements.style.value=editingStyle;
  $('#saved-version').value=selected?.id??'';
  return false;
}
async function selectConcept(item,style){
  if(!item)throw Error('This artwork source is unavailable. Refresh the queue before editing it.');
  const entry=entries.find(candidate=>sameItem(candidate,item)&&candidate.style===style);
  choose(entry??null,item,style);
  if(entry)await loadAudit(entry.id);
}
function showSource(){
  const item=items[Number(form.elements.meetingItem.value)],host=$('#source');
  host.replaceChildren();
  $('#planning-source').value=item?JSON.stringify({title:item.title,reference:item.reference,context:item.context?.slice(0,1000)},null,2):'';
  if(!item)return;
  const label=document.createElement('span');
  label.textContent=`${item.sourceStatus==='reviewed'?'Reviewed outline':'Discovered metadata - source review required'}. ${item.reference??''} `;
  host.append(label);
  if(item.sourceUrl){
    const link=document.createElement('a');link.textContent='Open official source';link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';host.append(link);
  }
  if(selected&&selected.sourceHash!==item.sourceHash)host.append(document.createTextNode(' Source changed: save edits and review again before approval.'));
}
async function loadItems(){
  const previous=form.elements.meetingItem.value,chosen=items[Number(previous)];
  items=await api('/api/admin/meetings');
  form.elements.meetingItem.replaceChildren();
  for(const [index,item] of items.entries()){
    const option=document.createElement('option');
    option.value=String(index);option.textContent=`${item.weekOf} - ${item.title}`;form.elements.meetingItem.append(option);
  }
  const index=items.findIndex(item=>item.meetingId===chosen?.meetingId&&item.partId===chosen?.partId);
  if(index>=0)form.elements.meetingItem.value=String(index);
  showSource();
}
async function updatePlanner(){
  clearTimeout(plannerTimer);
  planner=await api('/api/admin/planner');
  if(planner.enabled&&!$('#planning-provider').options.length){
    for(const provider of planner.providers){
      const option=document.createElement('option');option.value=provider.id;option.textContent=provider.id==='openrouter'?'OpenRouter':'Google Gemini';
      $('#planning-provider').append(option);
    }
    $('#planning-provider').value=planner.provider;
    $('#planning-model').value=planner.model;
  }
  if(planner.enabled&&!$('#planning-start').value){
    $('#planning-start').value=planner.defaultWeeks[0];
    $('#planning-end').value=planner.defaultWeeks.at(-1);
  }
  $('#planner-status').textContent=!planner.enabled?planner.message:
    `${planner.running?'Running saved instructions...':'Manual generation. Review the instructions and run when ready; refresh the queue after completion.'} Last/default provider: ${planner.provider}. Model: ${planner.model}. Last/default run weeks: ${planner.weeks.join(', ')}. Last completed: ${planner.lastCheckedAt??'not yet'}. New drafts last run: ${planner.generated??0}. Regenerated drafts last run: ${planner.regenerated??0}. Shared AI calls today: ${planner.callsToday}/${planner.maxCallsPerDay}.`;
  $('#planner-issues').replaceChildren();
  for(const issue of planner.issues??[]){
    const row=document.createElement('li');row.textContent=`${issue.week??''} ${issue.title??''}: ${issue.message}`;$('#planner-issues').append(row);
  }
  applyState();
  if(planner.running)plannerTimer=setTimeout(()=>void updatePlanner().catch(error=>message(error.message)),5000);
}
async function refresh(id=selected?.id){
  entries=await api('/api/admin/artwork');
  $('#queue').replaceChildren();
  const groups=new Map();
  for(const entry of entries){
    const key=`${entry.meetingId}/${entry.partId}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(entry);
  }
  for(const group of groups.values()){
    const entry=group[0],styles=[...new Set(group.map(candidate=>candidate.style))];
    const row=document.createElement('li'),button=document.createElement('button');
    button.type='button';button.textContent=`${entry.weekOf} - ${entry.partTitle} (${styles.join(', ')})`;
    button.addEventListener('click',()=>{if(allowSelectionChange())void run(()=>selectConcept(items.find(item=>sameItem(item,entry)),group.some(candidate=>candidate.style===editingStyle)?editingStyle:entry.style));});
    row.append(button);$('#queue').append(row);
  }
  const entry=entries.find(entry=>entry.id===id);
  choose(entry??null);
  if(entry)await loadAudit(entry.id);
}
async function loadAudit(id){
  const audit=await api(`/api/admin/artwork/${id}/audit`);
  if(selected?.id!==id)return;
  for(const event of audit){
    const row=document.createElement('li');
    row.textContent=`${event.recordedAt}: ${event.action}, revision ${event.revision} (administrator ${event.actor})`;
    $('#audit').append(row);
  }
}
function jsonOptions(data){return {method:'POST',headers:{'Content-Type':'application/json',...(selected?{'If-Match':String(selected.revision)}:{})},body:JSON.stringify(data)};}
function requireSavedConcept(){
  const item=items[Number(form.elements.meetingItem.value)];
  if(!selected||!item||item.meetingId!==selected.meetingId||item.partId!==selected.partId||
    form.elements.style.value!==selected.style||form.elements.safeTheme.value.trim()!==selected.safeTheme||form.elements.scene.value.trim()!==selected.scene)
    throw Error('Save concept edits before continuing its review.');
}
form.addEventListener('submit',event=>{
  event.preventDefault();
  void run(async()=>{
    const item=items[Number(form.elements.meetingItem.value)];
    if(!item)throw Error('Choose an eligible reviewed meeting item.');
    if(selected&&(!sameItem(item,selected)||form.elements.style.value!==selected.style))
      throw Error('Open the matching meeting item and style before saving. Existing artwork cannot be reassigned.');
    if(selected&&!confirm('Save edits and reset this draft, its image, approvals and publication?'))return;
    const entry=await api(selected?`/api/admin/artwork/${selected.id}`:'/api/admin/artwork',jsonOptions({
      meetingId:item.meetingId,partId:item.partId,style:form.elements.style.value,safeTheme:form.elements.safeTheme.value,scene:form.elements.scene.value
    }));
    await refresh(entry.id);message('Safe concept saved privately. Review it before generation.');
  });
});
for(const action of ['approve-concept','approve-image','publish','withdraw']){
  $('#'+action).addEventListener('click',()=>void run(async()=>{
    if(!selected)throw Error('Choose a draft first.');
    if(action!=='withdraw')requireSavedConcept();
    if(action==='approve-image'&&(!$('#preview').complete||!$('#preview').naturalWidth))throw Error('Load and inspect the complete image before approving it.');
    if(action==='publish'&&!confirm('Publish this exact approved image to the public artwork feed?'))return;
    const result=await api(`/api/admin/artwork/${selected.id}/actions`,jsonOptions({action,safetyReviewed:$('#safe').checked,sourceReviewed:$('#accurate').checked}));
    await refresh(result.id);message(action==='publish'?'Approved image published.':'Review action recorded.');
  }));
}
$('#upload').addEventListener('submit',event=>{
  event.preventDefault();
  void run(async()=>{
    const file=$('#upload').elements.image.files[0];
    if(!selected||!file)throw Error('Choose a draft and an image.');
    requireSavedConcept();
    if(file.size>8*1024*1024)throw Error('Choose an image smaller than 8 MB.');
    if(selected.imageHash&&!confirm('Replace the image and remove its approval/publication?'))return;
    const result=await api(`/api/admin/artwork/${selected.id}/image`,{method:'POST',headers:{'Content-Type':file.type,'If-Match':String(selected.revision)},body:file});
    $('#upload').reset();await refresh(result.id);message('Image uploaded privately. Inspect every detail before approving it.');
  });
});
$('#new').addEventListener('click',()=>{if(allowSelectionChange()){choose(null,editingItem,editingStyle);message('New draft. Blank drawing pages remain available to users.');}});
for(const control of [form.elements.meetingItem,form.elements.style])control.addEventListener('change',()=>{
  const item=items[Number(form.elements.meetingItem.value)],style=form.elements.style.value;
  if(allowSelectionChange())void run(()=>selectConcept(item,style));
});
$('#saved-version').addEventListener('change',()=>{
  const entry=entries.find(candidate=>candidate.id===$('#saved-version').value);
  if(entry&&allowSelectionChange())void run(async()=>{choose(entry);await loadAudit(entry.id);});
});
$('#refresh').addEventListener('click',()=>{if(allowSelectionChange())void run(async()=>{await loadItems();await refresh();await updatePlanner();message('Queue refreshed.');});});
$('#planning-text').addEventListener('input',applyState);
$('#planning-provider').addEventListener('change',()=>{
  $('#planning-model').value=planner.providers.find(provider=>provider.id===$('#planning-provider').value)?.model??'';
});
$('#planning-instructions').addEventListener('submit',event=>{
  event.preventDefault();
  void run(async()=>{
    planningInstructions=await api('/api/admin/planner/instructions',{
      method:'POST',headers:{'Content-Type':'application/json','If-Match':String(planningInstructions.revision)},
      body:JSON.stringify({instructions:$('#planning-text').value})
    });
    $('#planning-text').value=planningInstructions.instructions;
    message('Planning instructions saved. Nothing has been generated; run them when ready.');
  });
});
for(const [button,path,regenerate,retry] of [
  ['#plan-now','/api/admin/planner/run',false,false],
  ['#plan-regenerate','/api/admin/planner/regenerate',true,false],
  ['#plan-retry','/api/admin/planner/retry',false,true]
])$(button).addEventListener('click',()=>void run(async()=>{
  const provider=$('#planning-provider').value,model=$('#planning-model').value.trim();
  if(!model)throw Error('Choose a model ID before running.');
  const startWeek=$('#planning-start').value,endWeek=$('#planning-end').value;
  if(!startWeek||!endWeek)throw Error('Choose planning start and end dates before running.');
  const paid=provider==='openrouter'&&model!=='openrouter/free'&&!model.endsWith(':free');
  const warnings=[...(paid?[`Use PAID OpenRouter model ${model}? This run can incur charges at the provider's current rates.`]:[]),
    ...(regenerate?['Replace outdated unapproved AI drafts? Approved concepts and images will not change.']:[]),
    ...(retry?['Retry subjects without drafts in the selected weeks, including previous manual-review or invalid-response outcomes? This uses the shared AI allowance and may return the same issues. Existing artwork will not change.']:[])];
  if(warnings.length&&!confirm(warnings.join('\n\n')))return;
  await api(path,jsonOptions({instructionsRevision:planningInstructions.revision,provider,model,allowPaid:paid,startWeek,endWeek}));
  await updatePlanner();message('AI planning requested. Refresh the queue after it finishes; review any source-context issues.');
}));
$('#copy').addEventListener('click',()=>void run(async()=>{
  if(!selected?.conceptApproval)throw Error('Approve the safe concept before copying the generation prompt.');
  requireSavedConcept();
  await navigator.clipboard.writeText($('#prompt').value);message('Approved prompt copied. Finished images still require a separate visual review.');
}));
async function requirePrivateNetwork(){
  if(!navigator.serviceWorker?.controller)return;
  const ready=()=>new Promise(resolve=>{
    const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();resolve(false);},1000);
    channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();resolve(event.data?.adminNetworkOnly===true);};
    navigator.serviceWorker.controller?.postMessage({type:'ADMIN_NETWORK_ONLY'},[channel.port2]);
  });
  if(await ready())return;
  message('Updating offline protection before loading private administrator data...');
  const registration=await navigator.serviceWorker.getRegistration();
  if(!registration)throw Error('Close this tab and reopen administration to remove the old offline worker.');
  await registration.update();
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    if(!navigator.serviceWorker.controller||await ready())return;
  }
  throw Error('The offline worker could not be updated. Update the app, then reopen administration. No private records were loaded.');
}
void run(async()=>{
  await requirePrivateNetwork();
  const session=await api('/api/admin/session');
  $('#identity').textContent=`Signed in as ${session.email}`;
  planningInstructions=await api('/api/admin/planner/instructions');
  $('#planning-text').value=planningInstructions.instructions;
  await loadItems();await refresh();await updatePlanner();
  $('main').hidden=false;message('Protected admin workspace. Drafts are not public.');
});
