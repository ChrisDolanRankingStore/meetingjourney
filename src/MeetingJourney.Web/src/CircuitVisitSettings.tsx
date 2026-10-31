import {useEffect, useState} from 'react';
import {t, getLanguage} from './i18n';
import {emptyVisit, readCircuitVisit, savedVisitWeeks, saveCircuitVisit, visitDates, VISIT_UPDATED, type CircuitVisit} from './circuitVisit';

export function CircuitVisitSettings({weekOf}: {weekOf: string}) {
  const [date, setDate] = useState(() => visitDates(weekOf).tuesday);
  const [value, setValue] = useState(() => readCircuitVisit(weekOf, localStorage));
  const [weeks, setWeeks] = useState<string[]>([]);
  const [status, setStatus] = useState(''), [error, setError] = useState('');
  useEffect(() => { setDate(visitDates(weekOf).tuesday); }, [weekOf]);
  useEffect(() => {
    const refresh = () => {
      setValue(date ? readCircuitVisit(date, localStorage) : {...emptyVisit});
      setStatus(''); setError('');
      try { setWeeks(savedVisitWeeks(localStorage)); }
      catch { setError('Saved visit dates could not be opened. Please try again.'); }
    };
    refresh();
    window.addEventListener(VISIT_UPDATED, refresh);
    return () => window.removeEventListener(VISIT_UPDATED, refresh);
  }, [date]);
  const label = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(getLanguage(), {day: 'numeric', month: 'short', year: 'numeric'});
  const range = (day: string) => {
    const dates = visitDates(day);
    return `${label(dates.tuesday)} - ${label(dates.sunday)}`;
  };
  const update = (patch: Partial<CircuitVisit>) => { setValue(previous => ({...previous, ...patch})); setStatus(''); setError(''); };
  return <section className="settings-card circuit-visit-settings">
    <h3>{t('Circuit overseer visit')}</h3>
    <p>{t('Save a visit date in advance. Extra talks appear only for meetings in that visit week.')}</p>
    {weeks.length > 0 && <div className="saved-visit-dates">
      <h4>{t('Saved visits')}</h4>
      <p>{t('Choose a saved visit to edit its programme. To remove it, turn the visit off and save.')}</p>
      <ul>{weeks.map(week => <li key={week}><button type="button" aria-pressed={Boolean(date && visitDates(date).tuesday === visitDates(week).tuesday)} onClick={() => setDate(visitDates(week).tuesday)}>{range(week)}</button></li>)}</ul>
    </div>}
    <form onSubmit={event => {
      event.preventDefault();
      try {
        saveCircuitVisit(date, value, localStorage);
        window.dispatchEvent(new Event(VISIT_UPDATED));
        setError(''); setStatus('Visit programme saved on this device.');
      } catch (cause) { setStatus(''); setError(cause instanceof Error && cause.message.startsWith('This week already') ? cause.message : 'Could not save on this device. Please try again.'); }
    }}>
      <label className="visit-title">{t('Visit date')}<input type="date" required value={date} onChange={event => setDate(event.target.value)} /></label>
      <small>{t('Choose any date in the visit week. This does not change the meeting you are viewing.')}</small>
      {date && <p className="visit-date-range">{range(date)}</p>}
      <label><input type="checkbox" checked={value.enabled} onChange={event => update({enabled: event.target.checked})} />{t('Circuit overseer visits this week')}</label>
      <p>{t('The midweek meeting moves to Tuesday for this visit. Your usual meeting days stay saved.')}</p>
      {value.enabled && <>
        <label className="visit-title">{t('Circuit overseer name (optional)')}<input maxLength={120} value={value.overseerName} onChange={event => update({overseerName: event.target.value})} /></label>
        <p>{t('His midweek talk replaces the Congregation Bible Study. On Sunday, his public talk is followed by a 30-minute Watchtower study and a 30-minute concluding talk.')}</p>
        {([['midweekTitle', 'Midweek talk title'], ['publicTitle', 'Public talk title'], ['concludingTitle', 'Concluding talk title']] as const).map(([field, title]) =>
          <label className="visit-title" key={field}>{t(title)}<input maxLength={120} value={value[field]} placeholder={t('Optional title')} onChange={event => update({[field]: event.target.value})} /></label>)}
      </>}
      <button type="submit">{t('Save visit programme')}</button>
      {error && <p role="alert">{t(error)}</p>}<p role="status">{t(status)}</p>
      <small>{t('Saved for this week only, for both meetings. Talk notes and drawings remain on this device when you turn the visit off.')}</small>
    </form>
  </section>;
}
