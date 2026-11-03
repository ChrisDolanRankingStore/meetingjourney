import {useEffect, useState} from 'react';
import {COMFORT_CHANGED, readComfort, saveComfort, type ComfortPreferences} from './comfortPreferences';
import {t} from './i18n';

export function useComfort() {
  const [value, setValue] = useState(readComfort);
  useEffect(() => {
    const refresh = () => setValue(readComfort());
    window.addEventListener(COMFORT_CHANGED, refresh);
    return () => window.removeEventListener(COMFORT_CHANGED, refresh);
  }, []);
  return value;
}
export function ComfortSettings() {
  const value = useComfort();
  const [quiet,setQuiet]=useState(()=>localStorage.getItem('mj-engagement')==='quiet');
  const [status, setStatus] = useState('');
  useEffect(()=>{
    const refresh=()=>setQuiet(localStorage.getItem('mj-engagement')==='quiet');
    window.addEventListener('mj-guidance-change',refresh);
    return()=>window.removeEventListener('mj-guidance-change',refresh);
  },[]);
  const update = (patch: Partial<ComfortPreferences>) => {
    try { saveComfort({...value, ...patch}); window.dispatchEvent(new Event(COMFORT_CHANGED)); setStatus('Saved on this device'); }
    catch { setStatus('Could not save your preference. Please try again.'); }
  };
  return <section className="settings-card comfort-settings">
    <h3>{t('Everyday comfort')}</h3>
    <label><input type="checkbox" checked={quiet} onChange={event=>{
      try{localStorage.setItem('mj-engagement',event.target.checked?'quiet':'guided');window.dispatchEvent(new Event('mj-guidance-change'));setStatus('Saved on this device');}
      catch{setStatus('Could not save your preference. Please try again.');}
    }}/>{t('Quiet: fewer suggestions, activities on request')}</label>
    <label>{t('Text size')}<select value={value.textSize} onChange={event => update({textSize:event.target.value === 'larger' ? 'larger' : event.target.value === 'large' ? 'large' : 'standard'})}>
      <option value="standard">{t('Standard')}</option><option value="large">{t('Large')}</option><option value="larger">{t('Larger')}</option>
    </select></label>
    <label><input type="checkbox" checked={value.neutral} onChange={event => update({neutral:event.target.checked})}/>{t('Neutral notebook: hide scenery and companion')}</label>
    <label><input type="checkbox" checked={value.hideCounts} onChange={event => update({hideCounts:event.target.checked})}/>{t('Hide activity counts and completion feedback')}</label>
    <label><input type="checkbox" checked={value.showMinutes} onChange={event => update({showMinutes:event.target.checked})}/>{t('Show minutes')}</label>
    <label><input type="checkbox" checked={value.iconLabels} onChange={event => update({iconLabels:event.target.checked})}/>{t('Show icon hints on hover or focus')}</label>
    <p role="status">{t(status)}</p>
  </section>;
}
