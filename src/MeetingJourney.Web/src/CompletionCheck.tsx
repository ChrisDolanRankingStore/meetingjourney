import {t} from './i18n';
import {useEffect,useState} from 'react';
import {readNote,saveNote} from './storage';
import type {Meeting} from './types';
export function CompletionCheck({meeting}:{meeting:Meeting}){
 const[finished,setFinished]=useState(false),[attended,setAttended]=useState(false),[feeling,setFeeling]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{readNote(meeting.id,'meeting-status').then(note=>{if(!note)return;try{const saved=JSON.parse(note.text);setFinished(Boolean(saved.finished));setAttended(Boolean(saved.attended));setFeeling(saved.feeling??'');}catch{}}).catch(()=>undefined);},[meeting.id]);
 const save=(nextFinished:boolean,nextAttended:boolean,nextFeeling:string)=>{setFinished(nextFinished);setAttended(nextAttended);setFeeling(nextFeeling);void saveNote({meetingId:meeting.id,partId:'meeting-status',text:JSON.stringify({finished:nextFinished,attended:nextAttended,feeling:nextFeeling}),updatedAt:new Date().toISOString()}).then(()=>setMessage('Saved on this device.')).catch(()=>setMessage('Could not save this check-in.'));};
 return <section className="completion-check"><h3>{finished?t("A thought to take with you"):t("Finish in your own way")}</h3><p>{finished?t("Your notes are here whenever you want to return."):t("You can finish here even if you skipped parts. Nothing is graded.")}</p><label><input type="checkbox" checked={attended} onChange={e=>save(finished,e.target.checked,feeling)}/>{t("I attended this meeting")}</label><p>{t("How are you feeling now? ")}<small>{t("Optional")}</small></p><div className="sentence-starters">{[t("Settled"),t("Restless"),t("Ready for a break")].map(value=><button aria-pressed={feeling===value} key={value} onClick={()=>save(finished,attended,feeling===value?'':value)}>{value}</button>)}</div><button onClick={()=>save(!finished,attended,feeling)}>{finished?t("Reopen my journey"):t("Finish here for today")}</button><p role="status">{t(message)}</p></section>;
}
