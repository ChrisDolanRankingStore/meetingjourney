import {useEffect, useRef, useState} from 'react';
import {t} from './i18n';
import {BibleReferenceLinks} from './OfficialLinks';
import {lensPrompts, readListeningPreferences} from './listeningPreferences';
import {emptyStudy, readStudy, saveStudy, type StudyProgress} from './studyStorage';
import type {MeetingPart} from './types';
import './listening.css';

export function InterestPrompts({part}:{part?:MeetingPart}) {
  const [preferences] = useState(readListeningPreferences);
  if (!preferences.lenses.length) return null;
  return <section className="interest-prompts" aria-label={t('Your listening interests')}>{preferences.lenses.map(lens => <p key={lens}><strong>{t(lens)}: </strong>{part?.lensCues?.[lens.toLowerCase()]??t(lensPrompts[lens])}</p>)}</section>;
}

export function ListeningActivities({meetingId, part}: {meetingId: string; part: MeetingPart}) {
  const [value, setValue] = useState<StudyProgress>(() => emptyStudy(meetingId, `${part.id}:listening`));
  const current = useRef(value), saves = useRef(Promise.resolve());
  const [loaded, setLoaded] = useState(false), [status, setStatus] = useState('');
  useEffect(() => {
    let active = true;
    void readStudy(meetingId, `${part.id}:listening`).then(saved => { if (active) { current.current = saved ?? emptyStudy(meetingId, `${part.id}:listening`); setValue(current.current); setLoaded(true); } }).catch(() => { if (active) setStatus('Could not open this activity. Try reopening it.'); });
    return () => { active = false; };
  }, [meetingId, part.id]);
  const update = (patch: Partial<StudyProgress>) => {
    const next = {...current.current, ...patch, updatedAt: new Date().toISOString()}; current.current = next; setValue(next);
    saves.current = saves.current.catch(() => undefined).then(() => saveStudy(next)).then(() => setStatus('Saved on this device')).catch(() => setStatus('Could not save'));
  };
  return <div className="listening-activities"><InterestPrompts part={part}/>{part.type === 'BibleReading' && <section><h4>{t('Before the reading')}</h4><p>{t('What do you think you might notice? Choose one, or just listen.')}</p>
    <BibleReferenceLinks reference={part.textReference} />
    <div className="listening-chips">{['A person', 'A place', 'A helpful choice'].map(choice => <button type="button" key={choice} disabled={!loaded} aria-pressed={value.prediction === choice} onClick={() => update({prediction: choice, predictionChecked: undefined})}>{t(choice)}</button>)}</div>
    {value.prediction && <><h4>{t('After the reading')}</h4><p>{t('Did you notice what you expected? There is no wrong answer.')}</p><div className="listening-chips">{['I noticed that', 'Something different', 'I am not sure'].map(choice => <button type="button" key={choice} disabled={!loaded} aria-pressed={value.predictionChecked === choice} onClick={() => update({predictionChecked: choice})}>{t(choice)}</button>)}</div></>}
    <small role="status">{t(status)}</small>
  </section>}</div>;
}

export function QuietFidget() {
  const [turns, setTurns] = useState(0), [preferences] = useState(readListeningPreferences);
  return <div className="quiet-fidget"><button type="button" aria-label={t('Turn the silent shape')} onClick={() => { setTurns(value => (value + 1) % 8); if (preferences.haptics && typeof navigator.vibrate === 'function') navigator.vibrate(15); }}><svg viewBox="0 0 100 100" aria-hidden="true" style={{transform: `rotate(${turns * 45}deg)`}}><circle cx="50" cy="50" r="43" fill="var(--blue-soft)" stroke="var(--blue)" strokeWidth="2" /><path d="M50 12Q85 40 50 50Q15 60 50 88Q85 60 50 50Q15 40 50 12" fill="var(--blue)" /></svg></button><p>{t('Tap to turn. No sound, timer or target.')}</p></div>;
}
