import {t} from './i18n';
import {getLanguage} from './i18n';
import { useEffect, useRef, useState } from 'react';
import type { MeetingKind } from '../../../node-app/meeting-schedule.js';
import { suggestJourney, readCircuitAssembly } from './circuitAssembly';
import { CircuitVisitSettings } from './CircuitVisitSettings';
import { CircuitAssemblySettings } from './CircuitAssemblySettings';
import { ConventionSettings } from './ConventionSettings';
import { conventionDates, readConvention } from './convention';
import type { MeetingSchedule } from './useMeetingSchedule';

export function meetingDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(getLanguage(), { day: 'numeric', month: 'short' });
}

export function MeetingDaysSettings({ schedule }: { schedule: MeetingSchedule }) {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return <>
    <div className="settings-card meeting-days-settings">
      <h3>{t("Your meeting days")}</h3>
      <p>{t("Choose your congregation’s days. The app suggests the next meeting; you can always choose another.")}</p>
      <div className="meeting-days-fields">{(['midweek', 'weekend'] as MeetingKind[]).map(kind => <label key={kind}>
        {kind === 'midweek' ? t("Midweek") : t("Weekend")}
        <select value={schedule.days[kind]} onChange={event => schedule.changeDays({...schedule.days, [kind]: Number(event.target.value)})}>
          {names.map((name, day) => <option key={day} value={day}>{t(name)}</option>)}
        </select>
      </label>)}</div>
      <button type="button" className="text-button" onClick={schedule.useAutomatic}>{t("Use automatic meeting choice")}</button>
    </div>
    <CircuitVisitSettings weekOf={schedule.meeting.weekOf} />
    <CircuitAssemblySettings />
    <ConventionSettings />
  </>;
}

export function MeetingPicker({ schedule }: { schedule: MeetingSchedule }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState(schedule.selection.type);
  const [date, setDate] = useState(schedule.selection.date);
  const [error, setError] = useState('');
  useEffect(() => {
    if (schedule.pickerOpen) {
      setKind(schedule.selection.type); setDate(schedule.selection.date); setError('');
      if(typeof dialog.current?.showModal==='function') dialog.current.showModal(); else dialog.current?.setAttribute('open','');
    } else if(typeof dialog.current?.close==='function') dialog.current.close(); else dialog.current?.removeAttribute('open');
  }, [schedule.pickerOpen, schedule.selection.type, schedule.selection.date]);
  const suggestion = suggestJourney(schedule.today, schedule.days, localStorage);
  const convention = date ? readConvention(date, localStorage) : null;
  return <dialog ref={dialog} className="meeting-picker" aria-labelledby="meeting-picker-title" onCancel={() => schedule.setPickerOpen(false)} onClick={event => { if (event.target === dialog.current) schedule.setPickerOpen(false); }}>
    <form onSubmit={event => {
      event.preventDefault();
      if (!date) {setError('Choose a meeting date.'); return;}
      const savedEvent = readCircuitAssembly(date, localStorage) || readConvention(date, localStorage);
      if (kind === 'assembly' && !savedEvent) {setError('Save an assembly date below before opening its programme.'); return;}
      if (kind === 'convention' && !savedEvent) {setError('Save convention dates below before opening the programme.'); return;}
      schedule.choose({type:kind, date});
    }}>
      <div className="meeting-picker-heading"><h2 id="meeting-picker-title">{t("Which meeting?")}</h2><button type="button" aria-label={t("Close meeting choice")} onClick={() => schedule.setPickerOpen(false)}>×</button></div>
      {schedule.meeting.contentNotice && <p className="meeting-picker-hint">{schedule.meeting.contentNotice}</p>}
      <div className="meeting-kind-choices">{(['midweek', 'weekend', 'assembly', 'convention'] as const).map(type => <button key={type} type="button" aria-pressed={kind === type} onClick={() => setKind(type)}>{t(({midweek:'Midweek', weekend:'Weekend', assembly:'Assembly', convention:'Convention'})[type])}<small>{type === 'assembly' || type === 'convention' ? t('Saved programme') : type === 'midweek' ? t("Life and Ministry") : t("Public talk & study")}</small></button>)}</div>
      <label className="meeting-date-field">{t("Meeting date")}<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      {convention && <div className="convention-day-choices" aria-label={t('Convention day')}>{conventionDates(convention.date).map((day, index) =>
        <button type="button" key={day} aria-pressed={date === day} onClick={() => {setDate(day); setKind('convention');}}>
          {t(['Friday','Saturday','Sunday'][index])} · {meetingDateLabel(day)}
        </button>)}</div>}
      <p className="meeting-picker-hint">{t("Choose a date to prepare ahead or revisit a meeting. Each week keeps its own discoveries.")}</p>
      {error && <p role="alert">{t(error)}</p>}
      <button className="meeting-picker-apply" type="submit">{t("Open this journey →")}</button>
      <button className="meeting-picker-auto" type="button" onClick={schedule.useAutomatic}>{t("Automatic: ")}{t(({midweek:'Midweek', weekend:'Weekend', assembly:'Assembly', convention:'Convention'})[suggestion.type])} · {meetingDateLabel(suggestion.date)}</button>
    </form>
    <MeetingDaysSettings schedule={schedule} />
  </dialog>;
}
