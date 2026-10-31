import {useState} from 'react';
import {t} from './i18n';
import {interestLenses, readListeningPreferences, type ListeningPreferences} from './listeningPreferences';

export function ListeningSettings() {
  const [value, setValue] = useState(readListeningPreferences);
  const [status, setStatus] = useState('');
  const update = (next: ListeningPreferences) => {
    try { localStorage.setItem('mj-listening-preferences', JSON.stringify(next)); setValue(next); setStatus('Saved on this device'); }
    catch { setStatus('Could not save'); }
  };
  return <section className="settings-card listening-settings"><h3>{t('Listening preferences')}</h3>
    <fieldset><legend>{t('Choose up to two interests')}</legend><div className="listening-chips">{interestLenses.map(lens => <button type="button" key={lens} aria-pressed={value.lenses.includes(lens)} disabled={!value.lenses.includes(lens) && value.lenses.length >= 2} onClick={() => update({...value, lenses: value.lenses.includes(lens) ? value.lenses.filter(item => item !== lens) : [...value.lenses, lens]})}>{t(lens)}</button>)}</div></fieldset>
    <label>{t('Offer a quiet pause during studies')}<select value={value.pauseEvery} onChange={event => update({...value, pauseEvery: Number(event.target.value)})}><option value={0}>{t('Off')}</option>{[3, 5, 7].map(n => <option key={n} value={n}>{t('Every {count} paragraphs', {count: n})}</option>)}</select></label>
    <p>{t('Pause suggestions follow your paragraph changes. They never interrupt or advance the meeting.')}</p>
    <label><input type="checkbox" checked={value.haptics} onChange={event => update({...value, haptics: event.target.checked})} />{t('Brief tap feedback where supported')}</label>
    <small>{t('Sound stays off unless you choose to rehearse a comment.')}</small><p role="status">{t(status)}</p>
  </section>;
}
