import {useEffect, useState} from 'react';
import {t} from './i18n';

const key='mj-programme-import-choice';
export const PROGRAMME_IMPORT_CHANGED='mj-programme-import-changed';
export function programmeImportEnabled(){
  return localStorage.getItem(key)==='personal-v1';
}

const updatedNotice='Programme titles and references updated from WOL. Listening prompts are general; reviewed activities are added separately.';
const noticeSeenKey='mj-programme-import-notice-seen';

export function ProgrammeContentNotice({notice,home=false,className='meeting-content-notice'}:{notice?:string;home?:boolean;className?:string}){
  const [unseen]=useState(()=>localStorage.getItem(noticeSeenKey)!=='true');
  const imported=notice===updatedNotice||notice===t(updatedNotice,undefined,'es');
  const visible=Boolean(notice)&&(!imported||(home&&unseen));
  useEffect(()=>{
    if(visible&&imported) localStorage.setItem(noticeSeenKey,'true');
  },[visible,imported]);
  return visible?<small className={className}>{notice}</small>:null;
}

export function ProgrammeImport({home=false}:{home?:boolean}){
  const [enabled,setEnabled]=useState(programmeImportEnabled);
  const [expanded,setExpanded]=useState(()=>!programmeImportEnabled());
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState('');
  const choose=(allow:boolean)=>{
    try{
      localStorage.setItem(key,allow?'personal-v1':'disabled');
      setEnabled(allow);setConfirmed(false);setError('');setExpanded(false);
      window.dispatchEvent(new Event(PROGRAMME_IMPORT_CHANGED));
    }catch{setError('Could not save your import preference on this device. Please try again.');}
  };
  if(home)return enabled?null:<p className="home-import-prompt"><button type="button" className="text-button" onClick={()=>window.dispatchEvent(new Event('mj-open-settings'))}>{t('Ask a grown-up to turn on meeting import in Settings')}</button></p>;
  return <section className="settings-card programme-import" aria-label={t('Personal programme import')}>
    <details open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
      <summary>{t(enabled?'Personal programme import is on':'Personal programme import')}</summary>
      <p>{t('Meeting Journey is an independent focus aid designed to help neurodivergent users follow meetings. It is not affiliated with or endorsed by Jehovah’s Witnesses, and does not replace JW.org, JW Library or Watchtower ONLINE LIBRARY (wol.jw.org).')}</p>
      <p>{t('With your confirmation, the server retrieves programme details and reads cited scriptures temporarily to extract listening words. Only titles, timings, references and word lists are saved on this device. Article and verse text are not saved or sent to the app. Your personal notes are never sent to WOL.')}</p>
      <p>{t('Your confirmation records your personal-use preference; it does not grant publisher permission or change the source’s terms of use.')}</p>
      {enabled?<button type="button" onClick={()=>choose(false)}>{t('Stop future programme imports')}</button>:<>
        <label><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>{t('I want to import meeting schedules for my own personal use and understand that official material remains in JW.org, JW Library and WOL.')}</label>
        <button type="button" disabled={!confirmed} onClick={()=>choose(true)}>{t('Confirm and enable import')}</button>
        <p>{t('Import is optional. You can continue using general notebooks without enabling it, and change this choice in Settings. Stopping imports does not delete saved programmes, notes or drawings.')}</p>
      </>}
      {error&&<p role="alert">{t(error)}</p>}
    </details>
  </section>;
}
