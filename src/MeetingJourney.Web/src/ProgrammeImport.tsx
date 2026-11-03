import {useState} from 'react';
import {t} from './i18n';

const key='mj-programme-import-choice';
export const PROGRAMME_IMPORT_CHANGED='mj-programme-import-changed';
export function programmeImportEnabled(){
  return localStorage.getItem(key)==='personal-v1';
}

export function ProgrammeImport(){
  const [enabled,setEnabled]=useState(programmeImportEnabled);
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState('');
  const choose=(allow:boolean)=>{
    try{
      localStorage.setItem(key,allow?'personal-v1':'disabled');
      setEnabled(allow);setConfirmed(false);setError('');
      window.dispatchEvent(new Event(PROGRAMME_IMPORT_CHANGED));
    }catch{setError('Could not save your import preference on this device. Please try again.');}
  };
  return <section className="settings-card programme-import" aria-label={t('Personal programme import')}>
    <details open={!enabled}>
      <summary>{t(enabled?'Personal programme import is on':'Personal programme import')}</summary>
      <p>{t('Meeting Journey is an independent focus aid designed to help neurodivergent users follow meetings. It is not affiliated with or endorsed by Jehovah’s Witnesses, and does not replace JW.org, JW Library or Watchtower ONLINE LIBRARY (wol.jw.org).')}</p>
      <p>{t('With your confirmation, the app requests meeting item names, timings and scripture/publication references from WOL through our server, and saves the programme on this device. Article text, answers, images and your personal notes are not imported or sent to WOL.')}</p>
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
