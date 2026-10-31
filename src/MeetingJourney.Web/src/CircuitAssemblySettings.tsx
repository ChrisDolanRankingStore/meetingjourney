import {useEffect, useState} from 'react';
import {getLanguage, t} from './i18n';
import {OfficialLinks} from './OfficialLinks';
import {parseCalendarDate, weekOfDate} from '../../../node-app/meeting-schedule.js';
import {ASSEMBLY_UPDATED, removeCircuitAssembly, savedAssemblies, saveCircuitAssembly, type AssemblyType, type CircuitAssembly} from './circuitAssembly';
export function CircuitAssemblySettings() {
  const [date, setDate] = useState(''), [type, setType] = useState<AssemblyType>('circuit-overseer');
  const [records, setRecords] = useState<CircuitAssembly[]>([]);
  const [status, setStatus] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => {
      try { setRecords(savedAssemblies(localStorage)); }
      catch { setError('Saved assembly dates could not be opened. Please try again.'); }
    };
    refresh(); window.addEventListener(ASSEMBLY_UPDATED, refresh);
    return () => window.removeEventListener(ASSEMBLY_UPDATED, refresh);
  }, []);
  const label = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(getLanguage(), {day:'numeric', month:'short', year:'numeric'});
  return <section className="settings-card circuit-visit-settings assembly-settings">
    <h3>{t('Circuit assemblies')}</h3>
    <p>{t('Save the Saturday or Sunday date for each assembly. It replaces both congregation meetings that week.')}</p>
    <p>{t('Two programmes: with the circuit overseer and with the branch representative. Bundled service year: 2026–2027.')}</p>
    {records.length > 0 && <ul className="assembly-dates">{records.map(record => <li key={record.date}>
      <button type="button" onClick={() => {setDate(record.date); setType(record.type); setStatus(''); setError('');}}>
        {label(record.date)} · {t(record.type === 'circuit-overseer' ? 'With circuit overseer' : 'With branch representative')}
      </button>
      <button type="button" aria-label={t('Remove assembly on {date}', {date:label(record.date)})} onClick={() => {
        try {
          removeCircuitAssembly(record.date, localStorage);
          window.dispatchEvent(new Event(ASSEMBLY_UPDATED));
          setError(''); setStatus('Assembly date removed. Notes and drawings are kept; save the same date and programme to reopen them.');
        } catch {setError('Could not save on this device. Please try again.');}
      }}>{t('Remove')}</button>
    </li>)}</ul>}
    <form onSubmit={event => {
      event.preventDefault(); setStatus(''); setError('');
      try {
        parseCalendarDate(date);
        const existing = records.find(record => weekOfDate(record.date) === weekOfDate(date));
        if (existing && (existing.date !== date || existing.type !== type)) {
          setError('This week already has an assembly. Remove its saved date before replacing it. Existing notebooks will be kept.'); return;
        }
        saveCircuitAssembly({date, type, programme:'2026-2027'}, localStorage);
        window.dispatchEvent(new Event(ASSEMBLY_UPDATED));
        setStatus('Assembly date saved on this device.');
      } catch (cause) {
        setError(cause instanceof Error && /^(Choose |The bundled programmes|This week already)/.test(cause.message)
          ? cause.message : 'Could not save on this device. Please try again.');
      }
    }}>
      <label className="visit-title">{t('Assembly date')}<input type="date" required min="2026-09-01" max="2027-08-31" value={date} onChange={event => {setDate(event.target.value); setStatus(''); setError('');}} /></label>
      <label className="visit-title">{t('Assembly programme')}<select aria-label={t('Assembly programme')} value={type} onChange={event => setType(event.target.value === 'branch-representative' ? 'branch-representative' : 'circuit-overseer')}>
        <option value="circuit-overseer">{t('With circuit overseer')}</option><option value="branch-representative">{t('With branch representative')}</option>
      </select></label>
      <button type="submit">{t('Save assembly date')}</button>
      {error && <p role="alert">{t(error)}</p>}<p role="status">{t(status)}</p>
    </form>
    <p>{t('With circuit overseer')}: <OfficialLinks url="https://www.jw.org/finder?wtlocale=E&pub=ca-copgm27" /></p>
    <p>{t('With branch representative')}: <OfficialLinks url="https://www.jw.org/finder?wtlocale=E&pub=ca-brpgm27" /></p>
  </section>;
}
