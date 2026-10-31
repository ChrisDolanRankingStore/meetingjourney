import {t} from './i18n';
import {useEffect,useRef,useState} from 'react';
import {readNote,saveNote} from './storage';
export function OfficialReturn({meetingId,partId}:{meetingId:string;partId:string}){
 const pending=useRef<{partId:string;hidden:boolean}|null>(null);const[returnPart,setReturnPart]=useState<string|null>(null),[message,setMessage]=useState('');
 useEffect(()=>{
  const record=()=>{pending.current={partId,hidden:document.hidden};};
  const click=(event:MouseEvent)=>{const anchor=(event.target as Element).closest?.('a');if(!anchor)return;try{const url=new URL(anchor.href);if(url.protocol==='jwlibrary:'||url.hostname==='jw.org'||url.hostname.endsWith('.jw.org'))record();}catch{}};
  const visibility=()=>{if(!pending.current)return;if(document.hidden)pending.current.hidden=true;else if(pending.current.hidden){setReturnPart(pending.current.partId);pending.current=null;}};
  document.addEventListener('click',click,true);document.addEventListener('visibilitychange',visibility);window.addEventListener('mj-official-open',record);
  return()=>{document.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('mj-official-open',record);};
 },[partId]);
 if(!returnPart)return null;
 return <aside className="official-return" role="dialog" aria-modal="false" aria-labelledby="source-return-title"><button className="return-dismiss" aria-label={t("Dismiss return check-in")} onClick={()=>setReturnPart(null)}>×</button><h2 id="source-return-title">{t("Back from the material?")}</h2><p>{t("Would you like to record that you followed this part?")}</p><button onClick={async()=>{try{const saved=await readNote(meetingId,returnPart);await saveNote({meetingId,partId:returnPart,text:saved?.text??'',...saved,sourceConfirmations:[...new Set([...(saved?.sourceConfirmations??[]),'I followed this part'])],updatedAt:new Date().toISOString()});window.dispatchEvent(new Event('mj-note-updated'));setReturnPart(null);}catch{setMessage('Could not save. Your place is unchanged.');}}}>{t("I followed this part")}</button><button onClick={()=>setReturnPart(null)}>{t("Just opened it / skip")}</button><p role="status">{t(message)}</p></aside>;
}
