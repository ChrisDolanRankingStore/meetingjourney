import {useEffect, useRef} from 'react';
import {IllustratedIcon} from './IllustratedIcon';
import {MovementIcon} from './MovementIcon';
import {NotebookIcon} from './NotebookIcon';
import {t} from './i18n';

export type HomeGuideAction = 'continue' | 'outline' | 'doodle' | 'activities' | 'place' | 'note' | 'feelings' | 'source';
type Movement = 'fidget' | 'bounce' | 'stretch' | 'sway' | 'shake' | 'dance';

export function HomeGuidePanel({open, onClose, onAction, onMove, quiet, hasSource}: {
  open: boolean;
  onClose: () => void;
  onAction: (action: HomeGuideAction) => void;
  onMove: (action: Movement) => void;
  quiet: boolean;
  hasSource: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);
  const choose = (action: HomeGuideAction) => { onClose(); onAction(action); };
  return <dialog ref={dialog} id="home-guide-dialog" className="home-guide-dialog" aria-labelledby="home-guide-title"
    onCancel={event => { event.preventDefault(); onClose(); }} onClose={() => { if (!dialog.current?.open) onClose(); }}
    onKeyDown={event => { if (event.key==='Escape') { event.preventDefault(); onClose(); } }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className="home-guide-heading">
      <svg className="home-guide-sprig" viewBox="0 0 42 38" aria-hidden="true" focusable="false"><path d="M5 33Q17 16 35 6M13 24l-3-13m11 5 12 1" fill="none" stroke="#7b8055" strokeWidth="1.5" /><g fill="#8d9668"><ellipse cx="9" cy="16" rx="3.5" ry="7" transform="rotate(-25 9 16)" /><ellipse cx="18" cy="14" rx="3" ry="7" transform="rotate(25 18 14)" /><ellipse cx="26" cy="8" rx="3" ry="7" transform="rotate(40 26 8)" /><ellipse cx="26" cy="19" rx="7" ry="3" transform="rotate(-15 26 19)" /><ellipse cx="15" cy="27" rx="7" ry="3" transform="rotate(-15 15 27)" /></g></svg>
      <h2 id="home-guide-title">{t('Where shall we go?')}</h2>
      <button type="button" className="home-guide-close" aria-label={t('Close guide')} onClick={onClose}><NotebookIcon name="close" /></button>
    </header>
    <div className="home-guide-actions">
      <button type="button" onClick={() => choose('continue')}><IllustratedIcon name="discover" /><span><strong>{t('Continue journey')}</strong><small>{t('Go to your next part')}</small></span><NotebookIcon name="next" /></button>
      <button type="button" onClick={() => choose('outline')}><IllustratedIcon name="references" /><span><strong>{t('Meeting outline')}</strong><small>{t('See the full programme')}</small></span><NotebookIcon name="next" /></button>
      <button type="button" onClick={() => choose('doodle')}><IllustratedIcon name="notes" /><span><strong>{t('Doodle notes')}</strong><small>{t('Draw or write what you notice.')}</small></span><NotebookIcon name="next" /></button>
      {!quiet && <button type="button" onClick={() => choose('activities')}><IllustratedIcon name="connect" /><span><strong>{t('Activities')}</strong><small>{t('Choose an activity for this part')}</small></span><NotebookIcon name="next" /></button>}
      <button type="button" className="home-guide-place" onClick={() => choose('place')}><NotebookIcon name="pin" /><span>{t('Find my place')}<small>{t('Return to the part you left')}</small></span><NotebookIcon name="next" /></button>
    </div>
    <details className="home-guide-more">
      <summary>{t('More actions')}</summary>
      <div className="home-guide-secondary">
        <button type="button" onClick={() => choose('note')}><NotebookIcon name="note" />{t('Write a note')}</button>
        <button type="button" onClick={() => choose('feelings')}><NotebookIcon name="heart" />{t('Record a feeling')}</button>
        {hasSource && <button type="button" onClick={() => choose('source')}><NotebookIcon name="book" />{t('Open in JW Library')}</button>}
      </div>
      <fieldset className="home-guide-movements"><legend>{t('Need to move?')}</legend>
        {(['fidget', 'bounce', 'stretch', 'sway', 'shake', 'dance'] as const).map(action => <button type="button" key={action} onClick={() => onMove(action)}>
          <MovementIcon action={action} /><span>{t(({fidget:'Fidget', bounce:'Bounce / jump', stretch:'Stretch', sway:'Sway / rock', shake:'Shake it out', dance:'Dance'})[action])}</span>
        </button>)}
      </fieldset>
    </details>
  </dialog>;
}
