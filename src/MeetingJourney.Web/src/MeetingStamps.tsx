import {useEffect,useState} from 'react';
import {openDb} from './storage';
import type {Meeting, SavedNote, Stroke} from './types';
import type {StudyProgress} from './studyStorage';
import {useComfort} from './ComfortSettings';
import {notebookContext} from './notebookLabels';
import {t} from './i18n';
import {hasSavedDrawing} from './discoveryBook';
import type {DrawingArtwork} from './publishedArtwork';

type StampRecord={key:string;value:SavedNote|StudyProgress|Stroke[];artwork?:DrawingArtwork};
export function stampGroups(records:StampRecord[]) {
  const groups=new Map<string,Set<string>>();
  for(const entry of records) {
    const value=entry.value;
    const kept=Array.isArray(value)?hasSavedDrawing({value,artwork:entry.artwork}):
      'text' in value?Boolean(value.text.trim()||value.feedback?.trim()||value.feedbackChoices?.length||value.sourceConfirmations?.includes('I followed this part')):
      Boolean(value.draft?.trim()||value.comments.length||Object.values(value.connectionExamples??{}).some(text=>text.trim()));
    if(!kept)continue;
    const separator=entry.key.indexOf(':'),meetingId=entry.key.slice(0,separator),partId=entry.key.slice(separator+1).replace(/::page::\d+$/,'').replace(/:(listening|connections|bingo:(en|es))$/,'');
    if(['meeting-status','meeting-review'].includes(partId))continue;
    if(!groups.has(meetingId))groups.set(meetingId,new Set());
    groups.get(meetingId)!.add(partId);
  }
  return groups;
}
export function MeetingStamps({meeting}:{meeting:Meeting}) {
  const comfort=useComfort();
  const [groups,setGroups]=useState(new Map<string,Set<string>>()),[error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(comfort.hideCounts)return;
    let active=true;
    void (async()=>{
      const db=await openDb();
      return new Promise<StampRecord[]>((resolve,reject)=>{
        const tx=db.transaction(['notes','drawings','engagement']),records:StampRecord[]=[];
        for(const name of ['notes','drawings','engagement']){const request=tx.objectStore(name).getAll();request.onsuccess=()=>records.push(...request.result);}
        tx.oncomplete=()=>{db.close();resolve(records);};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
      });
    })().then(records=>{if(active){setGroups(stampGroups(records));setError('');}}).catch(()=>{if(active)setError('Could not open your stamps. Try again.');});
    return()=>{active=false;};
  },[meeting.id,comfort.hideCounts,retry]);
  if(comfort.hideCounts)return null;
  const row=(id:string,parts:{id:string;title:string}[])=><div className="meeting-stamp-row">{parts.map(part=><span key={part.id} className={`meeting-stamp${groups.get(id)?.has(part.id)?' is-kept':''}`} role="img" aria-label={groups.get(id)?.has(part.id)?t('Kept: {title}',{title:part.title}):part.title}><span aria-hidden="true">{groups.get(id)?.has(part.id)?'✓':''}</span></span>)}</div>;
  return <section className="meeting-stamps" aria-label={t('This week')}>
    <h3>{t('This week')}</h3>{row(meeting.id,meeting.parts)}
    {error&&<p role="status">{t(error)} <button type="button" onClick={()=>setRetry(value=>value+1)}>{t('Try again')}</button></p>}
    {[...groups.keys()].filter(id=>id!==meeting.id).sort().reverse().map(id=><details key={id}><summary>{notebookContext(id,'').label||id}</summary>{row(id,[...groups.get(id)!].map(partId=>({id:partId,title:notebookContext(id,partId).title})))}</details>)}
  </section>;
}
