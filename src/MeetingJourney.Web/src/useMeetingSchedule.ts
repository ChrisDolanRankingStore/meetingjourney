import { useEffect, useMemo, useState } from 'react';
import { getMeeting } from '../../../node-app/meeting-catalog.js';
import { localDateKey, normaliseMeetingDays, type MeetingDays } from '../../../node-app/meeting-schedule.js';
import { loadMeeting, loadMeetingMonth } from './api';
import type { Meeting } from './types';
import {VISIT_UPDATED} from './circuitVisit';
import {assemblyMeeting, readCircuitAssembly, resolveJourney, type JourneyOverride, type JourneySelection} from './circuitAssembly';
import {conventionMeeting, readConvention} from './convention';
import {PROGRAMME_IMPORT_CHANGED,programmeImportEnabled} from './ProgrammeImport';

function readSaved<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null; } catch { return null; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The bundled outline remains available offline. */ }
}

export function useMeetingSchedule() {
  const [today, setToday] = useState(localDateKey);
  const [days, setDays] = useState(() => normaliseMeetingDays(readSaved<MeetingDays>('mj-meeting-days')));
  const [override, setOverride] = useState(() => readSaved<JourneyOverride>('mj-meeting-choice'));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importRevision,setImportRevision]=useState(0);
  useEffect(()=>{
    const update=()=>setImportRevision(value=>value+1);
    window.addEventListener(PROGRAMME_IMPORT_CHANGED,update);
    window.addEventListener('storage',update);
    return()=>{window.removeEventListener(PROGRAMME_IMPORT_CHANGED,update);window.removeEventListener('storage',update);};
  },[]);
  const [,setVisitRevision]=useState(0);
  useEffect(()=>{const update=()=>setVisitRevision(value=>value+1);window.addEventListener(VISIT_UPDATED,update);return()=>window.removeEventListener(VISIT_UPDATED,update);},[]);
  const selection = resolveJourney(today, days, override,localStorage);
  const assembly = readCircuitAssembly(selection.date, localStorage);
  const convention = readConvention(selection.date, localStorage);
  const fallback = useMemo(() => {
    if (selection.type === 'convention') {
      if (!convention) throw Error('The saved convention could not be opened.');
      return conventionMeeting(convention, selection.date);
    }
    if (selection.type !== 'assembly') return getMeeting(selection.type, selection.date);
    if (!assembly) throw Error('The saved assembly could not be opened.');
    return assemblyMeeting(assembly);
  }, [selection.type, selection.date, assembly?.type, assembly?.programme, convention?.date]);
  const [downloaded, setDownloaded] = useState<Meeting | null>(null);
  const [, setCacheRevision] = useState(0);
  const savedMeeting = readSaved<Meeting>(`mj-meeting-cache:${fallback.id}`);
  const matches = (value: Meeting | null) => value?.id === fallback.id && value?.kind === selection.type && value?.weekOf === fallback.weekOf && Array.isArray(value?.parts) && value.parts.length > 0;
  const meeting = selection.type === 'assembly' || selection.type === 'convention' ? fallback : matches(downloaded) ? downloaded! : matches(savedMeeting) ? savedMeeting! : fallback;
  const currentMonth = today.slice(0, 7);
  const selectedMonth = selection.date.slice(0, 7);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      for (const month of new Set([currentMonth, selectedMonth])) {
        void loadMeetingMonth(`${month}-01`, controller.signal).then(meetings => {
          if (controller.signal.aborted) return;
          for (const next of meetings) {
            if (next.kind !== 'midweek' && next.kind !== 'weekend') continue;
            const expected = getMeeting(next.kind, next.weekOf);
            if (next.id !== expected.id || next.weekOf !== expected.weekOf || !next.parts?.length) continue;
            const existing=readSaved<Meeting>(`mj-meeting-cache:${next.id}`);
            if(existing?.contentStatus==='dated'&&next.contentStatus!=='dated')continue;
            save(`mj-meeting-cache:${next.id}`, next);
            setDownloaded(previous => previous?.id === next.id ? next : previous);
          }
          setCacheRevision(value => value + 1);
        }).catch(() => undefined);
      }
    };
    void refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 15 * 60 * 1000);
    return () => { controller.abort(); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [currentMonth, selectedMonth, importRevision]);

  useEffect(() => {
    const update = () => setToday(localDateKey());
    const timer = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    window.addEventListener('pageshow', update);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('pageshow', update); document.removeEventListener('visibilitychange', update); };
  }, []);

  useEffect(() => {
    const kind = selection.type;
    if (kind === 'assembly' || kind === 'convention') return;
    const controller = new AbortController();
    const refresh = () => loadMeeting(controller.signal, kind, selection.date).then(next => {
      // An older server may ignore the query. Never relabel its fixed meeting.
      if (controller.signal.aborted || next.id !== fallback.id || next.kind !== selection.type || next.weekOf !== fallback.weekOf || !next.parts?.length) return;
      const existing=readSaved<Meeting>(`mj-meeting-cache:${next.id}`);
      if(existing?.contentStatus==='dated'&&next.contentStatus!=='dated'){
        if(!programmeImportEnabled())return;
        const retained={...existing,contentNotice:'The programme could not be refreshed. Showing the last saved programme.'};
        setDownloaded(retained);save(`mj-meeting-cache:${next.id}`,retained);return;
      }
      setDownloaded(next);
      save(`mj-meeting-cache:${next.id}`, next);
    }).catch(() => undefined);
    void refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 15 * 60 * 1000);
    return () => { controller.abort(); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [selection.type, selection.date, fallback.id, fallback.weekOf, importRevision]);

  return {
    meeting, today, days, selection, pickerOpen, setPickerOpen,
    automatic: !override || override.chosenOn !== today,
    choose: (next: JourneySelection) => {
      setOverride({ ...next, chosenOn: today });
      save('mj-meeting-choice', { ...next, chosenOn: today });
      setPickerOpen(false);
    },
    useAutomatic: () => { setOverride(null); save('mj-meeting-choice', null); setPickerOpen(false); },
    changeDays: (next: MeetingDays) => { const valid = normaliseMeetingDays(next); setDays(valid); save('mj-meeting-days', valid); }
  };
}
export type MeetingSchedule = ReturnType<typeof useMeetingSchedule>;
