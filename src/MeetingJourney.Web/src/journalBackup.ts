import { openDb } from './storage.ts';
import {validConnectionChoice} from './connectionActivity.ts';
import {validDrawingArtwork,type DrawingArtwork} from './publishedArtwork.ts';
type Entry = { key: string; id?: string; modifiedAt?: string; updatedAt?:string; value: any; paper?: { width: number; height: number }; artwork?: DrawingArtwork };
type PreferenceRecord = {id:string;key:string;value:string;modifiedAt:string};
export interface JournalBackup { format: 'meeting-journey'; version: 1; formatVersion?: 2; exportedAt: string; notes: Entry[]; drawings: Entry[]; engagement: Entry[]; preferences: Record<string, string>; preferenceRecords?:PreferenceRecord[] }
const stores = ['notes', 'drawings', 'engagement'] as const;
const metadataKey='mj-backup-metadata';
const personalKey = (key: string) => key.startsWith('mj-') && !key.startsWith('mj-meeting-cache:') && !['mj-programme-import-choice','mj-parent-pin',metadataKey].includes(key);
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validDate=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
async function fingerprint(value:string){const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));return [...digest].map(item=>item.toString(16).padStart(2,'0')).join('');}
async function stableId(key:string){
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`MeetingJourney:${key}`))).slice(0,16);
 digest[6]=(digest[6]&0x0f)|0x80;digest[8]=(digest[8]&0x3f)|0x80;
 const hex=[...digest].map(value=>value.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function validateBackup(value: any): JournalBackup {
  if (!value || value.format !== 'meeting-journey' || value.version !== 1 || value.formatVersion!==undefined&&value.formatVersion!==2 || !validDate(value.exportedAt) || !value.preferences || typeof value.preferences !== 'object' || Array.isArray(value.preferences)) throw new Error('Not a supported Meeting Journey backup.');
  if(value.formatVersion===2&&(!Array.isArray(value.preferenceRecords)||value.preferenceRecords.length>20000))throw new Error('Invalid setting records.');
  const preferenceKeys=new Set<string>();
  for(const record of value.preferenceRecords??[]){
    if(!record||!uuidPattern.test(record.id)||!personalKey(record.key)||preferenceKeys.has(record.key)||typeof record.value!=='string'||value.preferences[record.key]!==record.value||!validDate(record.modifiedAt))throw new Error('Invalid setting record.');
    preferenceKeys.add(record.key);
  }
  if(value.formatVersion===2&&Object.keys(value.preferences).length!==preferenceKeys.size)throw new Error('Invalid setting records.');
  for (const name of stores) {
    const records = value[name] ??= [];
    if (!Array.isArray(records) || records.length > 20000) throw new Error('Too many backup records.');
    const keys = new Set();
    for (const entry of records) {
      if (!entry || typeof entry.key !== 'string' || !/^[a-zA-Z0-9_-]{1,100}:[a-zA-Z0-9_:-]{1,160}$/.test(entry.key) || keys.has(entry.key)) throw new Error('Invalid or repeated journal entry.');
      if(value.formatVersion===2&&(!uuidPattern.test(entry.id)||!validDate(entry.modifiedAt)))throw new Error('Invalid journal metadata.');
      keys.add(entry.key);
      if (name === 'drawings') {
        if (!Array.isArray(entry.value) || entry.value.length > 50000) throw new Error('Invalid drawing.');
        for (const stroke of entry.value) {
          if (!stroke || !['pen','eraser','highlighter','smudge','fill'].includes(stroke.mode) || typeof stroke.color !== 'string' || stroke.color.length > 60 || !Number.isFinite(stroke.size) || stroke.size <= 0 || stroke.size > 200 || !Array.isArray(stroke.points) || stroke.points.length % 2 || stroke.points.length > 1000000 || !stroke.points.every((p: unknown) => typeof p === 'number' && Number.isFinite(p) && Math.abs(p) < 1000000)) throw new Error('Invalid drawing stroke.');
          if(stroke.mode==='fill'&&(stroke.points.length!==2||!stroke.fillBounds||!['width','height'].every(d=>Number.isFinite(stroke.fillBounds[d])&&stroke.fillBounds[d]>0&&stroke.fillBounds[d]<=100000)||stroke.points[0]<0||stroke.points[1]<0||stroke.points[0]>=stroke.fillBounds.width||stroke.points[1]>=stroke.fillBounds.height))throw new Error('Invalid colour fill.');
        }
        if (entry.paper && !['width','height'].every(d => Number.isFinite(entry.paper[d]) && entry.paper[d] > 0 && entry.paper[d] <= 100000)) throw new Error('Invalid page size.');
        if(entry.artwork!==undefined&&!validDrawingArtwork(entry.artwork))throw Error('Invalid saved outline.');
      } else if (!entry.value || `${entry.value.meetingId}:${entry.value.partId}` !== entry.key) throw new Error('Meeting and part do not match.');
      if(name === 'notes') { const note=entry.value; if(note.feedback!==undefined && (typeof note.feedback!=='string'||note.feedback.length>100000)) throw Error('Invalid reflection'); for(const field of ['feedbackChoices','sourceConfirmations']) if(note[field]!==undefined && (!Array.isArray(note[field])||note[field].length>1000||!note[field].every((item:unknown)=>typeof item==='string'&&item.length<1000))) throw Error('Invalid reflection choices'); }
      if(name === 'engagement' && entry.value.bingoWords !== undefined && (!Array.isArray(entry.value.bingoWords) || entry.value.bingoWords.length > 100 || !entry.value.bingoWords.every((word: unknown) => typeof word === 'string' && word.length <= 60))) throw Error('Invalid bingo words');
      if(name === 'engagement' && entry.value.bingoSize !== undefined && entry.value.bingoSize !== 3 && entry.value.bingoSize !== 4) throw Error('Invalid bingo size');
      if(name === 'engagement') {
        const examples=entry.value.connectionExamples;
        if(examples!==undefined&&(!examples||typeof examples!=='object'||Array.isArray(examples)||!entry.value.partId.endsWith(':connections')||Object.keys(examples).length>20||Object.entries(examples).some(([source,text])=>typeof text!=='string'||text.length>1000||!validConnectionChoice(entry.value.meetingId,entry.value.partId,source,''))))throw Error('Invalid connection examples');
        for(const field of ['prediction','predictionChecked']) if(entry.value[field] !== undefined && (typeof entry.value[field] !== 'string' || entry.value[field].length > 200)) throw Error('Invalid listening choice');
        const choices=entry.value.pointChoices;
        const connections = entry.value.partId.endsWith(':connections');
        if(choices!==undefined && (!choices || typeof choices!=='object' || Array.isArray(choices) || Object.keys(choices).length>200 || Object.entries(choices).some(([key,choice])=>typeof choice!=='string'||choice.length>300||(connections ? !validConnectionChoice(entry.value.meetingId,entry.value.partId,key,choice) : !/^\d{1,3}$/.test(key))))) throw Error('Invalid listening points');
      }
      if(name === 'engagement') { const record=entry.value; if(!Number.isInteger(record.paragraph)||record.paragraph<1||record.paragraph>200||!Number.isInteger(record.scriptures)||record.scriptures<0||record.scriptures>10000||!Array.isArray(record.comments)||record.comments.length>300||!record.comments.every((c:any)=>c&&typeof c.id==='string'&&c.id.length<100&&typeof c.text==='string'&&c.text.length<=10000&&typeof c.ready==='boolean'&&typeof c.given==='boolean'&&Number.isInteger(c.paragraph)&&c.paragraph>=1&&c.paragraph<=200)||(record.draft!==undefined&&(typeof record.draft!=='string'||record.draft.length>10000))) throw Error('Invalid study record'); }
      if (name === 'notes' && (typeof entry.value.text !== 'string' || entry.value.text.length > 100000)) throw new Error('Invalid note.');
    }
  }
  for (const [key, item] of Object.entries(value.preferences)) if (!personalKey(key) || typeof item !== 'string' || item.length > 200000) throw new Error('Unsupported device setting.');
  return value as JournalBackup;
}
export async function exportJournal(storage: Storage = localStorage): Promise<JournalBackup> {
  const db = await openDb();
  const exportedAt=new Date().toISOString();
  const backup: JournalBackup = {format:'meeting-journey',version:1,formatVersion:2,exportedAt,notes:[],drawings:[],engagement:[],preferences:{},preferenceRecords:[]};
  await new Promise<void>((resolve,reject) => { const tx=db.transaction([...stores]); for (const name of stores) { const request=tx.objectStore(name).getAll(); request.onsuccess=()=>{backup[name]=request.result;}; } tx.oncomplete=()=>resolve(); tx.onabort=()=>reject(tx.error); tx.onerror=()=>reject(tx.error); }).finally(()=>db.close());
  for(const name of stores)backup[name]=await Promise.all(backup[name].map(async entry=>({...entry,id:await stableId(`${name}:${entry.key}`),modifiedAt:entry.modifiedAt??entry.value.updatedAt??entry.updatedAt??exportedAt,value:name==='engagement'?{...entry.value,comments:(entry.value.comments??[]).map((comment:any)=>({...comment,modifiedAt:comment.modifiedAt??entry.value.updatedAt??exportedAt}))}:entry.value})));
  let metadata:Record<string,{id:string;modifiedAt:string;valueHash:string}>={};
  try{const parsed=JSON.parse(storage.getItem(metadataKey)??'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))metadata=parsed;}catch{metadata={};}
  for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!key||!personalKey(key))continue;const item=storage.getItem(key);if(item===null)continue;const prior=metadata[key],hash=await fingerprint(item),id=prior?.id&&uuidPattern.test(prior.id)?prior.id:await stableId(`setting:${key}`),modifiedAt=prior?.valueHash===hash&&validDate(prior.modifiedAt)?prior.modifiedAt:exportedAt;backup.preferences[key]=item;backup.preferenceRecords!.push({id,key,value:item,modifiedAt});metadata[key]={id,modifiedAt,valueHash:hash};}
  storage.setItem(metadataKey,JSON.stringify(metadata));
  return backup;
}
export async function importJournal(input:unknown, includeSettings:boolean, storage:Storage=localStorage,mode:'merge'|'replace'='merge'){
  const backup=validateBackup(input), previous=new Map<string,string|null>(), db=await openDb(); let added=0,updated=0,kept=0;
  try {
    includeSettings=includeSettings||mode==='replace';
    let metadata:Record<string,{id:string;modifiedAt:string;valueHash:string}>={};
    try{const parsed=JSON.parse(storage.getItem(metadataKey)??'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))metadata=parsed;}catch{metadata={};}
    const incomingSettings=backup.preferenceRecords??await Promise.all(Object.entries(backup.preferences).map(async([key,value])=>({id:await stableId(`setting:${key}`),key,value,modifiedAt:backup.exportedAt})));
    const incomingEntries=Object.fromEntries(await Promise.all(stores.map(async name=>[name,await Promise.all(backup[name].map(async raw=>({...raw,id:raw.id??await stableId(`${name}:${raw.key}`),modifiedAt:raw.modifiedAt??raw.value.updatedAt??raw.updatedAt??backup.exportedAt,value:name==='engagement'?{...raw.value,comments:(raw.value.comments??[]).map((comment:any)=>({...comment,modifiedAt:comment.modifiedAt??raw.modifiedAt??raw.value.updatedAt??backup.exportedAt}))}:raw.value}))) ] as const)));
    if(includeSettings){
      for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key&&personalKey(key))previous.set(key,storage.getItem(key));}
      previous.set(metadataKey,storage.getItem(metadataKey));
      if(mode==='replace')for(const [key] of previous)if(key!==metadataKey)storage.removeItem(key);
      for(const entry of incomingSettings){
        const current=storage.getItem(entry.key),prior=metadata[entry.key];
        const localTime=current===null?undefined:prior?.valueHash===await fingerprint(current)&&validDate(prior.modifiedAt)?prior.modifiedAt:new Date().toISOString();
        if(mode==='replace'||current===null||!localTime||Date.parse(entry.modifiedAt)>Date.parse(localTime)){
          storage.setItem(entry.key,entry.value);metadata[entry.key]={id:entry.id,modifiedAt:entry.modifiedAt,valueHash:await fingerprint(entry.value)};updated++;
        }else{metadata[entry.key]={id:prior?.id??entry.id,modifiedAt:localTime,valueHash:await fingerprint(current)};kept++;}
      }
      storage.setItem(metadataKey,JSON.stringify(metadata));
    }
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction([...stores],'readwrite');for(const name of stores){const target=tx.objectStore(name);if(mode==='replace')target.clear();for(const entry of incomingEntries[name]){const request=target.get(entry.key);request.onsuccess=()=>{const existing=request.result;if(existing===undefined){target.put(entry);added++;return;}const newer=Date.parse(entry.modifiedAt)>Date.parse(existing.modifiedAt??existing.value.updatedAt??existing.updatedAt??'1970-01-01');let chosen=newer?entry:existing;if(name==='engagement'){const comments=new Map<string,any>();for(const comment of existing.value.comments??[])comments.set(comment.id,{...comment,modifiedAt:comment.modifiedAt??existing.modifiedAt??existing.value.updatedAt});for(const comment of entry.value.comments??[]){const previous=comments.get(comment.id);if(!previous||Date.parse(comment.modifiedAt??entry.modifiedAt)>Date.parse(previous.modifiedAt??'1970-01-01'))comments.set(comment.id,comment);}chosen={...chosen,value:{...chosen.value,comments:[...comments.values()]}};}if(newer){target.put(chosen);updated++;}else if(name==='engagement'&&JSON.stringify(chosen.value.comments)!==JSON.stringify(existing.value.comments)){target.put(chosen);updated++;}else kept++;};}}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    return {added,updated,kept};
  }catch(error){for(const [key,value] of previous){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{}}throw error;}finally{db.close();}
}
export async function deletePersonalData(storage:Storage=localStorage){
 const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction([...stores],'readwrite');for(const name of stores)tx.objectStore(name).clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);}).finally(()=>db.close());
 for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith('mj-'))storage.removeItem(key);}
}
export function downloadFile(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
