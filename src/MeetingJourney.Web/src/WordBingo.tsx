import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {getLanguage, t, tt} from './i18n';
import {IllustratedIcon} from './IllustratedIcon';
import {bingoLineCells, bingoSize, bingoWords} from './bingoBoard';
import {emptyStudy, readStudy, saveStudy, type StudyProgress} from './studyStorage';
import type {MeetingPart} from './types';
import './wordBingo.css';
import {useComfort} from './ComfortSettings';

export function WordBingo({meetingId, part, older, onClue, onWrite, onDraw}: {meetingId: string; part: MeetingPart; older: boolean; onClue?: () => void; onWrite?: () => void; onDraw?: () => void}) {
  const language = getLanguage();
  const comfort=useComfort();
  // A separate engagement record prevents the comment builder from overwriting taps.
  const recordId = `${part.id}:bingo:${language}`;
  const [value, setValue] = useState<StudyProgress>(() => emptyStudy(meetingId, recordId));
  const size = value.bingoSize ?? bingoSize(older);
  const board = bingoWords(part, size, language);
  const [loaded, setLoaded] = useState(false), [status, setStatus] = useState('');
  const current = useRef(value);
  const saves = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    setLoaded(false);
    void readStudy(meetingId, recordId).then(saved => {
      if (!active) return;
      current.current = saved ?? emptyStudy(meetingId, recordId);
      setValue(current.current); setLoaded(true);
    }).catch(() => { if (active) setStatus('Could not open your word bingo. Reopen this activity to try again.'); });
    return () => { active = false; };
  }, [meetingId, recordId]);
  const selected = value.bingoWords ?? [];
  const found = board.filter(word=>selected.includes(word)).length;
  const objective = part.activities.find(activity=>activity.mission?.listeningObjective)?.mission?.listeningObjective ?? part.question ?? part.summary;
  const line = bingoLineCells(board, selected, size);
  const persist = (next: StudyProgress) => {
    current.current = next; setValue(next);
    saves.current = saves.current.catch(() => undefined).then(() => saveStudy(next)).then(() => setStatus('Saved on this device')).catch(() => setStatus('Could not save. Keep this view open and try again.'));
  };
  const toggle = (word: string) => {
    const previous = current.current, marked = previous.bingoWords ?? [];
    persist({...previous, bingoWords: marked.includes(word) ? marked.filter(item => item !== word) : [...marked, word], updatedAt: new Date().toISOString()});
  };
  return <section className="word-bingo" aria-label={t('Word bingo')} aria-busy={!loaded}>
    <div className="bingo-size-picker" role="group" aria-label={t('Bingo grid size')}>{([3,4] as const).map(option=><button type="button" key={option} disabled={!loaded} aria-pressed={size===option} onClick={()=>persist({...current.current,bingoSize:option,updatedAt:new Date().toISOString()})}>{option} × {option}</button>)}</div>
    <p className="bingo-instruction">{t('Tap a word when you hear it. Tap again to undo.')}</p>
    <div className="bingo-workspace">
    <div className="word-bingo-board" style={{'--bingo-size': size} as CSSProperties}>
      {board.map(word => <button type="button" key={word} disabled={!loaded} aria-pressed={selected.includes(word)} className={!comfort.hideCounts&&line.has(word) ? 'is-line' : ''} onClick={() => toggle(word)}><span>{word}</span>{selected.includes(word) && <span className="bingo-check" aria-hidden="true">✓</span>}</button>)}
    </div>
    <aside className="bingo-listening-card">
      <h4><IllustratedIcon name="clue" />{t('Listen for…')}</h4>
      <p>{objective}</p>
      {!comfort.hideCounts&&<div className="bingo-progress"><strong>{tt`${found} of ${board.length} found`}</strong><progress value={found} max={board.length} aria-label={t('Words noticed')} /></div>}
      {onClue&&<button type="button" className="bingo-clue" onClick={onClue}><IllustratedIcon name="discover" />{t('Need a clue?')}</button>}
    </aside>
    </div>
    {(onWrite||onDraw)&&<nav className="bingo-notebook-actions" aria-label={t('Your notebook')}>
      {onWrite&&<button type="button" onClick={onWrite}><IllustratedIcon name="notes" />{t('My notes')}</button>}
      {onDraw&&<button type="button" onClick={onDraw}><IllustratedIcon name="notes" />{t('Draw')}</button>}
    </nav>}
    <small>{t('Words from this part and familiar meeting words. You may not hear every word.')}</small>
    {!comfort.hideCounts&&line.size > 0 && <p role="status">{t('A line of words you noticed. Keep listening at your own pace.')}</p>}
    <small role="status">{t(status)}</small>
  </section>;
}
