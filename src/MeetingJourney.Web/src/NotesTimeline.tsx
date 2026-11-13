import {useEffect,useRef,useState} from 'react';
import {openDb,type MeetingDrawingRecord} from './storage';
import type {SavedNote} from './types';
import type {StudyProgress} from './studyStorage';
import {getLanguage,t} from './i18n';
import {ScriptureLookup} from './ScriptureLookup';
import {HistoricalNotebook, type HistoricalTarget} from './HistoricalNotebook';
import {notebookContext,notebookSearch} from './notebookLabels';
import {hasSavedDrawing} from './discoveryBook';

type TimelineNote=HistoricalTarget&{key:string;text:string;updatedAt:string};
function noteDate(note:TimelineNote){
  return Number.isFinite(Date.parse(note.updatedAt))?new Date(note.updatedAt).toLocaleDateString(getLanguage(),{year:'numeric',month:'long',day:'numeric'}):note.updatedAt;
}
export async function readNotesTimeline():Promise<TimelineNote[]> {
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(['notes','engagement','drawings']);
    const notes=transaction.objectStore('notes').getAll(),study=transaction.objectStore('engagement').getAll(),drawings=transaction.objectStore('drawings').getAll();
    transaction.oncomplete=()=>{
      const entries:TimelineNote[]=[];
      for(const entry of notes.result as {key:string;value:SavedNote}[]){
        const note=entry.value,text=[note.text,note.feedback,...(note.feedbackChoices??[]).map(choice=>t(choice))].filter(Boolean).join('\n');
        if(text.trim())entries.push({...note,key:`notes:${entry.key}`,text,kind:'note'});
      }
      for(const entry of study.result as {key:string;value:StudyProgress}[]){
        const note=entry.value,text=[note.draft,...note.comments.map(comment=>comment.text),...Object.values(note.connectionExamples??{}),...(note.partId.endsWith(':connections')?Object.entries(note.pointChoices??{}).filter(([,target])=>target).map(([source,target])=>`${t(source)} → ${t(target)}`):[])].filter(Boolean).join('\n');
        if(text.trim())entries.push({...note,key:`study:${entry.key}`,text,kind:'study'});
      }
      for(const entry of drawings.result as (MeetingDrawingRecord&{updatedAt?:string})[]){
        if(!hasSavedDrawing(entry))continue;
        const separator=entry.key.indexOf(':');
        if(separator<0)continue;
        entries.push({key:`drawing:${entry.key}`,meetingId:entry.key.slice(0,separator),partId:entry.key.slice(separator+1),text:t('My drawing'),updatedAt:entry.updatedAt??'',kind:'drawing'});
      }
      db.close();resolve(entries.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
    };
    transaction.onerror=()=>{db.close();reject(transaction.error);};
    transaction.onabort=()=>{db.close();reject(transaction.error);};
  });
}

export function NotesTimeline(){
  const [notes,setNotes]=useState<TimelineNote[]>([]),[search,setSearch]=useState(()=>{try{return sessionStorage.getItem('mj-history-search')??'';}catch(error){console.warn('Could not restore history search.',error);return '';}}),[status,setStatus]=useState('Opening your notes...');
  const [retry,setRetry]=useState(0);
  const [editing,setEditing]=useState<HistoricalTarget|null>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{let active=true;setStatus('Opening your notes...');void readNotesTimeline().then(notes=>{if(active){setNotes(notes);setStatus('');}}).catch(()=>{if(active)setStatus('Could not open your notes. Try again.');});return()=>{active=false;};},[retry]);
  const filtered=notes.filter(note=>{const context=notebookContext(note.meetingId,note.partId);return notebookSearch(`${note.text} ${note.meetingId} ${context.label} ${context.reference} ${note.updatedAt}`).includes(notebookSearch(search));});
  useEffect(()=>{try{sessionStorage.setItem('mj-history-search',search);}catch(error){console.warn('Could not remember history search.',error);}},[search]);
  if(editing)return <HistoricalNotebook key={`${editing.kind}:${editing.meetingId}:${editing.partId}`} target={editing} onClose={()=>{setEditing(null);setRetry(value=>value+1);requestAnimationFrame(()=>searchRef.current?.focus());}}/>;
  return <section className="notes-timeline">
    <h2>{t('Previous notes')}</h2><p>{t('Grouped by last edit. Each entry shows its meeting date. Search words, titles, references or dates.')}</p>
    <label>{t('Search notes or date')}<input ref={searchRef} type="search" value={search} onChange={event=>setSearch(event.target.value)}/></label>
    {status&&<p role="status">{t(status)}{status.startsWith('Could')&&<button type="button" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</button>}</p>}
    {!status&&!filtered.length&&<p>{t('No saved notes match this search.')}</p>}
    {filtered.map((note,index)=><div key={note.key}>
      {(index===0||noteDate(note)!==noteDate(filtered[index-1]))&&<h3>{note.updatedAt?t('Last edited {date}',{date:noteDate(note)}):t('Edit date unavailable')}</h3>}
      <details><summary>{notebookContext(note.meetingId,note.partId).label}<span>{note.text.slice(0,90)}</span></summary><p className="timeline-note-text">{note.text}</p><ScriptureLookup text={note.text}/><button type="button" onClick={()=>setEditing(note)}>{t(note.kind==='drawing'?'Edit drawing':'Edit note')}</button></details>
    </div>)}
  </section>;
}
