import {lazy, Suspense, useEffect, useRef, useState} from 'react';
import {readNote, saveNote} from './storage';
import {readStudy, saveStudy} from './studyStorage';
import type {StudyProgress} from './studyStorage';
import type {SavedNote} from './types';
import {t} from './i18n';
import {ScriptureLookup} from './ScriptureLookup';
import {notebookContext} from './notebookLabels';

const DrawingPad=lazy(()=>import('./DrawingPad').then(module=>({default:module.DrawingPad})));
export type HistoricalTarget={meetingId:string;partId:string;kind:'note'|'study'|'drawing'};

export function HistoricalNotebook({target,onClose}:{target:HistoricalTarget;onClose:()=>void}){
  const [note,setNote]=useState<SavedNote>();
  const [study,setStudy]=useState<StudyProgress>();
  const [status,setStatus]=useState('Opening your notes...');
  const [busy,setBusy]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [retry,setRetry]=useState(0);
  const closeRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const previous=document.activeElement;
    closeRef.current?.focus();
    let active=true;
    const load=async()=>{
      if(target.kind==='note'){
        const saved=await readNote(target.meetingId,target.partId);
        if(!saved)throw Error('Saved notebook not found.');
        if(active)setNote(saved);
      }else if(target.kind==='study'){
        const saved=await readStudy(target.meetingId,target.partId);
        if(!saved)throw Error('Saved notebook not found.');
        if(active)setStudy(saved);
      }
    };
    if(target.kind!=='drawing')void load().then(()=>{
      if(!active)return;
      setStatus('');
    }).catch(()=>{if(active)setStatus('Could not open your notes. Try again.');});
    return()=>{active=false;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
  },[target,retry]);
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    const navigate=(event:MouseEvent)=>{
      if(!(event.target instanceof Element)||event.target.closest('.historical-notebook')||!event.target.closest('button,a'))return;
      if(!window.confirm(t('Discard unsaved changes?'))){event.preventDefault();event.stopPropagation();}
    };
    window.addEventListener('beforeunload',unload);
    document.addEventListener('click',navigate,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};
  },[dirty]);
  const save=async()=>{
    setBusy(true);
    try{
      if(note)await saveNote({...note,updatedAt:new Date().toISOString()});
      else if(study)await saveStudy({...study,updatedAt:new Date().toISOString()});
      setStatus('Saved on this device');
      setDirty(false);
    }catch{setStatus('Could not save. Keep this view open and try again.');}
    finally{setBusy(false);}
  };
  const page=target.partId.match(/^(.*)::page::(\d+)$/);
  return <section className={`historical-notebook ${target.kind==='drawing'?'editing-drawing':''}`} aria-label={t('Edit saved notebook')}>
    <header><h2>{t('Edit saved notebook')}</h2><button ref={closeRef} type="button" disabled={busy} onClick={()=>{if(!dirty||window.confirm(t('Discard unsaved changes?')))onClose();}}>{t('Back to previous notes')}</button></header>
    <p>{notebookContext(target.meetingId,target.partId).label}</p>
    {target.kind==='drawing'?<Suspense fallback={<p role="status">{t('Opening your drawing page…')}</p>}><DrawingPad meetingId={target.meetingId} partId={page?.[1]??target.partId} initialPage={page?Number(page[2]):0}/></Suspense>:<fieldset disabled={busy} onChange={()=>{setDirty(true);setStatus('');}}>
      <legend className="visually-hidden">{t('Edit saved notebook')}</legend>
      {note&&<><label>{t('My thought')}<textarea value={note.text} maxLength={100000} onChange={event=>setNote({...note,text:event.target.value})}/></label><label>{t('What I noticed')}<textarea value={note.feedback??''} maxLength={100000} onChange={event=>setNote({...note,feedback:event.target.value})}/></label><ScriptureLookup text={note.text}/></>}
      {study&&<><label>{t('Your own words')}<textarea value={study.draft??''} maxLength={10000} onChange={event=>setStudy({...study,draft:event.target.value})}/></label>{study.comments.map(comment=><label key={comment.id}>{t('Paragraph')} {comment.paragraph}<textarea value={comment.text} maxLength={10000} onChange={event=>setStudy({...study,comments:study.comments.map(item=>item.id===comment.id?{...item,text:event.target.value}:item)})}/></label>)}{Object.entries(study.connectionExamples??{}).map(([source,text])=><label key={source}>{t('My example for {idea} (optional)',{idea:t(source)})}<textarea value={text} maxLength={1000} onChange={event=>setStudy({...study,connectionExamples:{...study.connectionExamples,[source]:event.target.value}})}/></label>)}<ScriptureLookup text={study.draft??''}/></>}
      {(note||study)&&<button type="button" disabled={busy} onClick={()=>void save()}>{t('Save changes')}</button>}
      <p role="status">{t(status)}</p>
      {!note&&!study&&status.startsWith('Could')&&<button type="button" onClick={()=>{setStatus('Opening your notes...');setRetry(value=>value+1);}}>{t('Try again')}</button>}
    </fieldset>}
  </section>;
}
