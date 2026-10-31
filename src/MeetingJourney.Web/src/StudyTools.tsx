import {t, tt, getLanguage} from './i18n';
import {useEffect, useRef, useState} from 'react';
import {emptyStudy, readStudy, saveStudy, type StudyProgress} from './studyStorage';
import {allowsComments, appendListeningPoint, localRehearsalVoices, pauseBoundary, readListeningPreferences} from './listeningPreferences';
import {InterestPrompts, QuietFidget} from './ListeningActivities';
import type {MeetingPart} from './types';

function Rehearsal({text}: {text: string}) {
  const [volume, setVolume] = useState(.25), [speaking, setSpeaking] = useState(false), [status, setStatus] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const stop = () => { if (utterance.current) { utterance.current = null; window.speechSynthesis.cancel(); } setSpeaking(false); };
  useEffect(() => {
    if (!supported) return;
    const refresh = () => setVoices(localRehearsalVoices(window.speechSynthesis.getVoices(), getLanguage()));
    refresh(); window.speechSynthesis.addEventListener('voiceschanged', refresh);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', refresh); if (utterance.current) { utterance.current = null; window.speechSynthesis.cancel(); } };
  }, [supported]);
  useEffect(() => { stop(); }, [text]);
  return <div className="rehearsal-controls"><button type="button" disabled={!supported || !voices.length || !text.trim()} onClick={() => {
    stop(); setStatus('');
    const next = new SpeechSynthesisUtterance(text); next.voice = voices[0]; next.lang = voices[0].lang; next.volume = volume;
    next.onend = () => { if (utterance.current === next) { utterance.current = null; setSpeaking(false); } };
    next.onerror = () => { if (utterance.current === next) { utterance.current = null; setSpeaking(false); setStatus('Speech is unavailable. You can read your words quietly instead.'); } };
    utterance.current = next; setSpeaking(true); window.speechSynthesis.speak(next);
  }}>{t('Rehearse aloud')}</button><button type="button" disabled={!speaking} onClick={stop}>{t('Stop speaking')}</button>
    <label>{t('Rehearsal volume')}<input aria-label={t('Rehearsal volume')} type="range" min="0" max="1" step=".05" value={volume} onChange={event => { stop(); setVolume(Number(event.target.value)); }} /></label>
    <small>{t('Uses an installed offline voice. Check the volume or use headphones before playing.')}</small>
    {(!supported || !voices.length) && <small>{t('No offline voice is available for this language. You can read your words quietly instead.')}</small>}<small role="status">{t(status)}</small>
  </div>;
}

export function StudyTools({meetingId, part, teen, quiet, onDraw, onWrite}: {meetingId:string; part:MeetingPart; teen:boolean; quiet:boolean; onDraw:()=>void; onWrite:()=>void}) {
  const [value, setValue] = useState<StudyProgress>(() => emptyStudy(meetingId, part.id));
  const [loaded, setLoaded] = useState(false), [status, setStatus] = useState(''), [pause, setPause] = useState(false), [pauseOffered, setPauseOffered] = useState(false);
  const [preferences] = useState(readListeningPreferences);
  const current = useRef(value), saves = useRef(Promise.resolve());
  const study = allowsComments(part.type), total = part.studyGuide?.paragraphCount ?? value.total;
  useEffect(() => {
    let active = true;
    void readStudy(meetingId, part.id).then(saved => { if (active) { current.current = saved ?? emptyStudy(meetingId, part.id); setValue(current.current); setLoaded(true); } }).catch(() => { if (active) setStatus('Study notes could not be opened. Try reopening this part.'); });
    return () => { active = false; };
  }, [meetingId, part.id]);
  const update = (patch: Partial<StudyProgress>) => {
    const next = {...current.current, ...patch, updatedAt: new Date().toISOString()}; current.current = next; setValue(next);
    saves.current = saves.current.catch(() => undefined).then(() => saveStudy(next)).then(() => setStatus('Saved on this device')).catch(() => setStatus('Could not save. Keep this view open and try again.'));
  };
  const paragraph = (next: number) => {
    if (!Number.isInteger(next) || next < 1 || next > (total ?? 200)) return;
    if (pauseBoundary(current.current.paragraph, next, preferences.pauseEvery)) setPauseOffered(true);
    update({paragraph: next});
  };
  const cue = part.studyGuide?.cues.find(item => value.paragraph >= item.from && value.paragraph <= item.to);
  const choices = cue?.pointChoices ?? ['A helpful example', 'A reason for hope', 'A kind choice'];
  const pointKey = String(cue?.from ?? value.paragraph);
  const ready = study && value.comments.some(comment => comment.ready && !comment.given);
  if (pause) return <div className="study-tools pause-card"><h4>{t('A quiet pause')}</h4><p>{t('Rest your hands. Look away from the screen, or let your companion move. Come back whenever you are ready.')}</p><QuietFidget /><button type="button" onClick={() => setPause(false)}>{t('Return to my place')}</button><button type="button" onClick={onDraw}>{t('Draw quietly')}</button></div>;
  return <div className="study-tools" aria-busy={!loaded}>
    <p className="tool-introduction">{study ? teen ? t('Follow the discussion in the way that helps you.') : t('One small step at a time. You can just listen, too.') : part.type === 'PublicTalk' ? t('Listen to the talk. Keep a thought or sketch for yourself; there are no audience comments.') : t('Follow this programme part. Keep a thought or sketch for yourself; these are personal notes, not audience comments.')}</p>
    {!quiet && <InterestPrompts />}
    {study && <section className="paragraph-tracker"><div className="paragraph-controls">
      <button type="button" disabled={!loaded || value.paragraph <= 1} aria-label={t('Previous paragraph')} onClick={() => paragraph(value.paragraph - 1)}>−</button>
      <label>{t('Paragraph')}{total && <small>{t(' of ')}{total}</small>}<input aria-label={t('Current paragraph')} type="number" min="1" max={total ?? 200} value={value.paragraph} disabled={!loaded} onChange={event => paragraph(Number(event.target.value))} /></label>
      <button type="button" disabled={!loaded || value.paragraph >= (total ?? 200)} aria-label={t('Next paragraph')} onClick={() => paragraph(value.paragraph + 1)}>+</button>
    </div>{total && <progress aria-label={t('Your paragraph position')} value={value.paragraph} max={total} />}
      {!quiet && <p>{cue?.prompt ?? t('Listen for one idea you would like to keep from this paragraph.')}</p>}
      {!part.studyGuide?.paragraphCount && <details><summary>{t('Set the number of paragraphs')}</summary><label>{t('Total')}<input type="number" min={value.paragraph} max="200" value={value.total ?? ''} disabled={!loaded} onChange={event => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= value.paragraph && next <= 200) update({total: next}); }} /></label></details>}
    </section>}
    {!quiet && study && pauseOffered && <aside className="pause-offer"><p>{t('Would a quiet pause help? Your place is saved.')}</p><button type="button" onClick={() => { setPauseOffered(false); setPause(true); }}>{t('Take a quiet pause')}</button><button type="button" onClick={() => setPauseOffered(false)}>{t('Keep listening')}</button></aside>}
    {!quiet && study && <section className="pick-the-point"><h4>{t('Pick a point to keep')}</h4><p>{cue?.pointChoices ? t('Which idea fits what you noticed? Any choice is fine.') : t('Choose a listening lens. These are prompts, not a quiz about the paragraph.')}</p><div className="listening-chips">{choices.map(choice => <button type="button" key={choice} disabled={!loaded} aria-pressed={value.pointChoices?.[pointKey] === choice} onClick={() => update({pointChoices: {...current.current.pointChoices, [pointKey]: choice}, draft: appendListeningPoint(current.current.draft, t(choice))})}>{t(choice)}</button>)}</div></section>}
    {study ? <section className="comment-builder"><h4>{teen ? t('Prepare a comment') : t('Something I could say')}</h4>
      {ready && <p role="status" className="comment-ready">{t('Ready to comment ✓')}</p>}
      <div className="sentence-starters">{['I noticed…', 'The scripture helps me…', 'One thing I could try…'].map(starter => <button type="button" key={starter} disabled={!loaded} onClick={() => update({draft: t(starter).replace(/…$/, ' ')})}>{t(starter)}</button>)}</div>
      <label>{t('Your own words')}<textarea disabled={!loaded} value={value.draft ?? ''} maxLength={10000} onChange={event => update({draft: event.target.value})} placeholder={t('Type, or use your keyboard’s dictation.')} rows={3} /></label>
      <button type="button" disabled={!loaded || !value.draft?.trim() || value.comments.length >= 300} onClick={() => update({draft: '', comments: [...current.current.comments, {id: crypto.randomUUID(), paragraph: value.paragraph, text: value.draft!.trim(), ready: false, given: false}]})}>{t('Keep this comment')}</button>
      <Rehearsal text={value.draft ?? ''} />
      {value.comments.map(comment => <div className="prepared-comment" key={comment.id}><small>{tt`Paragraph ${comment.paragraph}`}</small><p>{comment.text}</p><button type="button" disabled={!loaded || comment.given} aria-pressed={comment.ready && !comment.given} onClick={() => update({comments: current.current.comments.map(item => item.id === comment.id ? {...item, ready: !item.ready} : item)})}>{t('Ready to comment')}</button>
        <label><input type="checkbox" checked={comment.given} onChange={event => update({comments: current.current.comments.map(item => item.id === comment.id ? {...item, given: event.target.checked, ready: false} : item)})} />{t('I chose to share this comment')}</label><Rehearsal text={comment.text} /></div>)}
    </section> : <section className="talk-listening-kit"><h4>{t('Keep a listening note')}</h4><button type="button" onClick={onWrite}>{t('The speaker’s main question')}</button><button type="button" onClick={onDraw}>{t('Sketch an example or illustration')}</button>
      {value.draft?.trim() && <details><summary>{t('Previously saved draft')}</summary><p>{value.draft}</p></details>}
      {value.comments.length > 0 && <details><summary>{t('Previously saved thoughts')}</summary>{value.comments.map(comment => <p key={comment.id}>{comment.text}</p>)}</details>}
    </section>}
    <section className="scripture-spotter"><h4>{teen ? t('Scriptures noticed') : t('I heard a scripture')}</h4><div><button type="button" disabled={!loaded} aria-label={t('Remove one scripture count')} onClick={() => update({scriptures: Math.max(0, current.current.scriptures - 1)})}>−</button><output aria-live="polite">{value.scriptures}</output><button type="button" disabled={!loaded} onClick={() => update({scriptures: Math.min(10000, current.current.scriptures + 1)})}>{t('Scripture +')}</button></div><small>{t('Optional. Tap when you notice one; nothing is scored.')}</small></section>
    <div className="study-tool-links"><button type="button" onClick={onDraw}>{t('Draw')}</button><button type="button" onClick={onWrite}>{t('My note')}</button><button type="button" onClick={() => setPause(true)}>{t('Take a quiet pause')}</button></div><p role="status" className="study-save-status">{t(status)}</p>
  </div>;
}
