import { openDb } from './storage.ts';
import {connectionSources, connectionTargets} from './connectionActivity.ts';
type Entry = { key: string; value: any; paper?: { width: number; height: number } };
export interface JournalBackup { format: 'meeting-journey'; version: 1; exportedAt: string; notes: Entry[]; drawings: Entry[]; engagement: Entry[]; preferences: Record<string, string> }
const stores = ['notes', 'drawings', 'engagement'] as const;
const personalKey = (key: string) => key.startsWith('mj-') && !key.startsWith('mj-meeting-cache:');
export function validateBackup(value: any): JournalBackup {
  if (!value || value.format !== 'meeting-journey' || value.version !== 1 || typeof value.exportedAt !== 'string' || !value.preferences || typeof value.preferences !== 'object' || Array.isArray(value.preferences)) throw new Error('Not a supported Meeting Journey backup.');
  for (const name of stores) {
    const records = value[name] ??= [];
    if (!Array.isArray(records) || records.length > 20000) throw new Error('Too many backup records.');
    const keys = new Set();
    for (const entry of records) {
      if (!entry || typeof entry.key !== 'string' || !/^[a-zA-Z0-9_-]{1,100}:[a-zA-Z0-9_:-]{1,160}$/.test(entry.key) || keys.has(entry.key)) throw new Error('Invalid or repeated journal entry.');
      keys.add(entry.key);
      if (name === 'drawings') {
        if (!Array.isArray(entry.value) || entry.value.length > 50000) throw new Error('Invalid drawing.');
        for (const stroke of entry.value) if (!stroke || !['pen','eraser','highlighter'].includes(stroke.mode) || typeof stroke.color !== 'string' || stroke.color.length > 60 || !Number.isFinite(stroke.size) || stroke.size <= 0 || stroke.size > 200 || !Array.isArray(stroke.points) || stroke.points.length % 2 || stroke.points.length > 1000000 || !stroke.points.every((p: unknown) => typeof p === 'number' && Number.isFinite(p) && Math.abs(p) < 1000000)) throw new Error('Invalid drawing stroke.');
        if (entry.paper && !['width','height'].every(d => Number.isFinite(entry.paper[d]) && entry.paper[d] > 0 && entry.paper[d] <= 100000)) throw new Error('Invalid page size.');
      } else if (!entry.value || `${entry.value.meetingId}:${entry.value.partId}` !== entry.key) throw new Error('Meeting and part do not match.');
      if(name === 'notes') { const note=entry.value; if(note.feedback!==undefined && (typeof note.feedback!=='string'||note.feedback.length>100000)) throw Error('Invalid reflection'); for(const field of ['feedbackChoices','sourceConfirmations']) if(note[field]!==undefined && (!Array.isArray(note[field])||note[field].length>1000||!note[field].every((item:unknown)=>typeof item==='string'&&item.length<1000))) throw Error('Invalid reflection choices'); }
      if(name === 'engagement' && entry.value.bingoWords !== undefined && (!Array.isArray(entry.value.bingoWords) || entry.value.bingoWords.length > 100 || !entry.value.bingoWords.every((word: unknown) => typeof word === 'string' && word.length <= 60))) throw Error('Invalid bingo words');
      if(name === 'engagement' && entry.value.bingoSize !== undefined && entry.value.bingoSize !== 3 && entry.value.bingoSize !== 4) throw Error('Invalid bingo size');
      if(name === 'engagement') {
        for(const field of ['prediction','predictionChecked']) if(entry.value[field] !== undefined && (typeof entry.value[field] !== 'string' || entry.value[field].length > 200)) throw Error('Invalid listening choice');
        const choices=entry.value.pointChoices;
        const connections = entry.value.partId.endsWith(':connections');
        if(choices!==undefined && (!choices || typeof choices!=='object' || Array.isArray(choices) || Object.keys(choices).length>200 || Object.entries(choices).some(([key,choice])=>typeof choice!=='string'||choice.length>300||(connections ? !connectionSources.includes(key)||(choice!==''&&!connectionTargets.includes(choice)) : !/^\d{1,3}$/.test(key))))) throw Error('Invalid listening points');
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
  const backup: JournalBackup = {format:'meeting-journey',version:1,exportedAt:new Date().toISOString(),notes:[],drawings:[],engagement:[],preferences:{}};
  await new Promise<void>((resolve,reject) => { const tx=db.transaction([...stores]); for (const name of stores) { const request=tx.objectStore(name).getAll(); request.onsuccess=()=>{backup[name]=request.result;}; } tx.oncomplete=()=>resolve(); tx.onabort=()=>reject(tx.error); tx.onerror=()=>reject(tx.error); }).finally(()=>db.close());
  for(let i=0;i<storage.length;i++){const key=storage.key(i); if(key && personalKey(key)) backup.preferences[key]=storage.getItem(key)!;}
  return backup;
}
export async function importJournal(input:unknown, includeSettings:boolean, storage:Storage=localStorage){
  const backup=validateBackup(input), previous=new Map<string,string|null>(), db=await openDb(); let added=0,kept=0;
  try {
    if(includeSettings) for(const [key,value] of Object.entries(backup.preferences)){previous.set(key,storage.getItem(key));storage.setItem(key,value);}
    await new Promise<void>((resolve,reject)=>{const tx=db.transaction([...stores],'readwrite');for(const name of stores)for(const entry of backup[name]){const target=tx.objectStore(name),request=target.get(entry.key);request.onsuccess=()=>{if(request.result!==undefined)kept++;else{target.put(entry);added++;}};}tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    return {added,kept};
  }catch(error){for(const [key,value] of previous){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{}}throw error;}finally{db.close();}
}
export async function deletePersonalData(storage:Storage=localStorage){
 const db=await openDb();await new Promise<void>((resolve,reject)=>{const tx=db.transaction([...stores],'readwrite');for(const name of stores)tx.objectStore(name).clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);}).finally(()=>db.close());
 for(let i=storage.length-1;i>=0;i--){const key=storage.key(i);if(key?.startsWith('mj-'))storage.removeItem(key);}
}
export function downloadFile(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
