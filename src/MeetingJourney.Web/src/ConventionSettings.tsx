import {useEffect, useState} from 'react';
import {getLanguage, t} from './i18n';
import {OfficialLinks} from './OfficialLinks';
import {VISIT_UPDATED} from './circuitVisit';
import {conventionDates, removeConvention, savedConventions, saveConvention, type Convention} from './convention';
export function ConventionSettings() {
  const [date, setDate] = useState(''), [records, setRecords] = useState<Convention[]>([]);
  const [status, setStatus] = useState(''), [error, setError] = useState('');
  useEffect(() => {
    const refresh = () => {
      try {setRecords(savedConventions(localStorage));}
      catch {setError('Saved convention dates could not be opened. Please try again.');}
    };
    refresh(); window.addEventListener(VISIT_UPDATED, refresh);
    return () => window.removeEventListener(VISIT_UPDATED, refresh);
  }, []);
  const label = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(getLanguage(), {day:'numeric', month:'short', year:'numeric'});
  return <section className="settings-card circuit-visit-settings">
    <h3>{t('Three-day convention')}</h3>
    <p>{t('Save the opening Friday. The convention runs Friday to Sunday and replaces both congregation meetings that week.')}</p>
    <p>{t('Bundled programme: 2026 “Eternal Happiness”. Other years will need their own programme update.')}</p>
    {records.length > 0 && <ul className="assembly-dates">{records.map(record => <li key={record.date}>
      <button type="button" onClick={() => setDate(record.date)}>{label(record.date)} - {label(conventionDates(record.date)[2])}</button>
      <button type="button" aria-label={t('Remove convention on {date}', {date:label(record.date)})} onClick={() => {
        try {
          removeConvention(record.date, localStorage); window.dispatchEvent(new Event(VISIT_UPDATED));
          setError(''); setStatus('Convention dates removed. Notes and drawings are kept; save the same dates to reopen them.');
        } catch {setError('Could not save on this device. Please try again.');}
      }}>{t('Remove')}</button>
    </li>)}</ul>}
    <form onSubmit={event => {
      event.preventDefault(); setStatus(''); setError('');
      try {
        saveConvention({date, programme:'2026'}, localStorage);
        window.dispatchEvent(new Event(VISIT_UPDATED)); setStatus('Convention dates saved on this device.');
      } catch (cause) {
        setError(cause instanceof Error && /^(Choose |The bundled convention|This week already)/.test(cause.message)
          ? cause.message : 'Could not save on this device. Please try again.');
      }
    }}>
      <label className="visit-title">{t('Convention opening Friday')}<input type="date" required min="2026-01-01" max="2026-12-31" value={date} onChange={event => {setDate(event.target.value); setStatus(''); setError('');}} /></label>
      <button type="submit">{t('Save convention dates')}</button>{error && <p role="alert">{t(error)}</p>}<p role="status">{t(status)}</p>
    </form>
    <OfficialLinks url="https://www.jw.org/finder?wtlocale=E&pub=co-pgm26" />
  </section>;
}
