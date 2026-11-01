import {useEffect,useState} from 'react';
import {openDb} from './storage';
import type {SavedNote, Meeting} from './types';
import type {StudyProgress} from './studyStorage';
import {getLanguage,t} from './i18n';
import {ScriptureLookup} from './ScriptureLookup';

type TimelineNote={key:string;meetingId:string;partId:string;text:string;updatedAt:string};
function noteDate(note:TimelineNote){
  return Number.isFinite(Date.parse(note.updatedAt))?new Date(note.updatedAt).toLocaleDateString(getLanguage(),{year:'numeric',month:'long',day:'numeric'}):note.updatedAt;
}
function noteLabel(note:TimelineNote){
  const type=note.meetingId.startsWith('assembly-')?'Assembly':note.meetingId.startsWith('convention-')?'Convention':note.meetingId.startsWith('weekend-')?'Weekend':'Midweek';
  const date=note.meetingId.match(/\d{4}-\d{2}-\d{2}/)?.[0]??'';
  let title=note.partId.replace(/::page::\d+$/, '').replace(/:connections$/, '').replace(/-/g,' ');
  try{
    const raw=localStorage.getItem(`mj-meeting-cache:${note.meetingId}`);
    if(raw){const meeting=JSON.parse(raw) as Meeting;title=meeting.parts.find(part=>part.id===note.partId.replace(/::page::\d+$/, '').replace(/:connections$/, ''))?.title??title;}
  }catch(error){console.warn('Could not read cached note title.',error);}
  return `${t(type)} · ${date} · ${title}`;
}
export async function readNotesTimeline():Promise<TimelineNote[]> {
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(['notes','engagement']);
    const notes=transaction.objectStore('notes').getAll(),study=transaction.objectStore('engagement').getAll();
    transaction.oncomplete=()=>{
      const entries:TimelineNote[]=[];
      for(const entry of notes.result as {key:string;value:SavedNote}[]){
        const note=entry.value,text=[note.text,note.feedback].filter(Boolean).join('\n');
        if(text.trim())entries.push({...note,key:`notes:${entry.key}`,text});
      }
      for(const entry of study.result as {key:string;value:StudyProgress}[]){
        const note=entry.value,text=[note.draft,...note.comments.map(comment=>comment.text)].filter(Boolean).join('\n');
        if(text.trim())entries.push({...note,key:`study:${entry.key}`,text});
      }
      db.close();resolve(entries.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
    };
    transaction.onerror=()=>{db.close();reject(transaction.error);};
    transaction.onabort=()=>{db.close();reject(transaction.error);};
  });
}

export function NotesTimeline(){
  const [notes,setNotes]=useState<TimelineNote[]>([]),[search,setSearch]=useState(''),[status,setStatus]=useState('Opening your notes...');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{let active=true;setStatus('Opening your notes...');void readNotesTimeline().then(notes=>{if(active){setNotes(notes);setStatus('');}}).catch(()=>{if(active)setStatus('Could not open your notes. Try again.');});return()=>{active=false;};},[retry]);
  const filtered=notes.filter(note=>`${note.text} ${note.meetingId} ${note.partId} ${note.updatedAt}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="notes-timeline">
    <h2>{t('Previous notes')}</h2><p>{t('Newest saved notes first, across meetings and assemblies. Search words or a date such as 2026-11.')}</p>
    <label>{t('Search notes or date')}<input type="search" value={search} onChange={event=>setSearch(event.target.value)}/></label>
    {status&&<p role="status">{t(status)}{status.startsWith('Could')&&<button type="button" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</button>}</p>}
    {!status&&!filtered.length&&<p>{t('No saved notes match this search.')}</p>}
    {filtered.map((note,index)=><div key={note.key}>
      {(index===0||noteDate(note)!==noteDate(filtered[index-1]))&&<h3>{noteDate(note)}</h3>}
      <details><summary>{noteLabel(note)}<span>{note.text.slice(0,90)}</span></summary><p className="timeline-note-text">{note.text}</p><ScriptureLookup text={note.text}/></details>
    </div>)}
  </section>;
}
