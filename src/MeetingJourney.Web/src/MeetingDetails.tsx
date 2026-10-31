import {t} from './i18n';
import {OfficialLinks} from './OfficialLinks';
import {NotebookIcon} from './NotebookIcon';
import {useLanguage} from './LanguageSelector';
import {lookupSong, songbookUrl} from './songs';
import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {Meeting, MeetingPart} from './types';
import {DETAILS_UPDATED, readMeetingDetails, saveLocalTalkDetails, saveLocalTitle, saveSongDetails, songDraft} from './localMeetingDetails';

function SongDetailsForm({meetingId, part}: {meetingId: string; part: MeetingPart}) {
  const language = useLanguage();
  const initial = songDraft(part, meetingId, localStorage, language);
  const [number, setNumber] = useState(initial.songNumber?.toString() ?? '');
  const [title, setTitle] = useState(initial.songTitle);
  const [custom, setCustom] = useState(initial.titleMode !== 'catalogue' && Boolean(initial.songTitle));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const song = lookupSong(number, language);
  function save(reset = false) {
    try {
      if (reset) saveLocalTitle(meetingId, part.id, '', localStorage);
      else saveSongDetails(meetingId, part.id, number, title, localStorage, {automaticTitle: !custom});
      window.dispatchEvent(new Event(DETAILS_UPDATED));
      setError('');
      setMessage(reset ? 'Programme details restored on this device.' : 'Saved for this meeting on this device.');
      if (reset) {
        const restored = songDraft(part, meetingId, localStorage, language);
        setNumber(restored.songNumber?.toString() ?? ''); setTitle(restored.songTitle); setCustom(false);
      }
    } catch (cause) {
      setMessage('');
      const inputError = cause instanceof Error && /^(Use a whole|Add a song)/.test(cause.message);
      setError(inputError ? cause.message : 'Could not save on this device. Your changes are still here; please try again.');
    }
  }
  return <form className="meeting-details-form" onSubmit={event => {event.preventDefault(); save();}}>
    <label>{t('Song number')}<input inputMode="numeric" maxLength={3} value={number} onChange={event => {setNumber(event.target.value); setMessage(''); setError('');}} placeholder={t('e.g. 106')} /></label>
    <div className="official-song-result" aria-live="polite"><small>{t('Official title - available offline')}</small><strong>{song?.title ?? t(number.trim() ? t("No official title is bundled for this number. You can add your own title.") : t("Enter a song number to see its title."))}</strong></div>
    <label className="song-custom-choice"><input type="checkbox" checked={custom} onChange={event => setCustom(event.target.checked)} />{t('Use my own title')}</label>
    {custom && <label>{t('Song title')}<input maxLength={120} value={title} onChange={event => {setTitle(event.target.value); setMessage('');}} placeholder={t('Title from the songbook')} /></label>}
    <OfficialLinks url={song?.appUrl} webUrl={song?.url ?? songbookUrl(language)} />
    <small>{t('The title follows your app language. Personal notes stay as you wrote them.')}</small>
    <div className="settings-action-row"><button type="submit">{t('Save song details')}</button><button type="button" onClick={() => save(true)}>{t('Restore programme details')}</button></div>
    {error && <p role="alert">{t(error)}</p>}<p role="status">{t(message)}</p>
  </form>;
}

export function SongDetailsButton({meetingId, part}: {meetingId: string; part: MeetingPart}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useId();
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    return () => trigger.current?.focus();
  }, [open]);
  return <>
    <button ref={trigger} type="button" className="song-details-trigger icon-action" aria-label={t("Song details")} title={t("Song details")} onClick={() => setOpen(true)}><NotebookIcon name="music" /></button>
    {open && createPortal(<dialog ref={dialog} className="song-details-dialog" aria-labelledby={heading} onCancel={() => setOpen(false)} onClose={() => {setOpen(false); trigger.current?.focus();}}>
      <button type="button" className="song-details-close" aria-label={t("Close song details")} onClick={() => setOpen(false)}>×</button>
      <h2 id={heading}>{t("Your song for this stop")}</h2>
      <SongDetailsForm meetingId={meetingId} part={part} />
      <button type="button" className="song-details-done" onClick={() => setOpen(false)}>{t("Back to the journey")}</button>
    </dialog>, document.body)}
  </>;
}

function LocalTitleForm({meetingId, part, published = false}: {meetingId: string; part: MeetingPart; published?: boolean}) {
  const entry = readMeetingDetails(meetingId, localStorage)[part.id];
  const [text, setText] = useState(typeof entry === 'string' ? entry : entry && 'title' in entry ? entry.title : '');
  const [speakerName, setSpeakerName] = useState(typeof entry === 'object' && 'speakerName' in entry ? entry.speakerName : '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  return <form className="meeting-details-form" onSubmit={event => {
    event.preventDefault();
    try {
      saveLocalTalkDetails(meetingId, part.id, published ? '' : text, speakerName, localStorage);
      window.dispatchEvent(new Event(DETAILS_UPDATED));
      setError('');
      setMessage('Saved for this meeting on this device.');
    } catch {setMessage(''); setError('Could not save on this device. Your changes are still here; please try again.');}
  }}>
    {!published && <><label>{t("Local title")}<input maxLength={120} value={text} onChange={event => {setText(event.target.value); setMessage(''); setError('');}} placeholder={t("Title announced at your congregation")} /></label>
    <small>{t("Leave this blank to restore the programme title.")}</small></>}
    <label>{t('Speaker name (optional)')}<input maxLength={120} value={speakerName} onChange={event => {setSpeakerName(event.target.value); setMessage(''); setError('');}} /></label>
    <small>{t('Names stay as you enter them, in either app language.')}</small>
    <div className="settings-action-row"><button type="submit">{t("Save meeting details")}</button></div>
    {error && <p role="alert">{t(error)}</p>}
    <p role="status">{t(message)}</p>
  </form>;
}

export function LocalPartTitles({meeting}: {meeting: Meeting}) {
  if (meeting.kind === 'assembly' || meeting.kind === 'convention') return <><section className="settings-card">
    <h3>{t('Assembly programme')}</h3><p>{t('Assembly titles follow the published programme. Your personal answers and drawings stay in each talk notebook.')}</p>
    <OfficialLinks url={meeting.material.appUrl} webUrl={meeting.material.sourceUrl ?? meeting.material.appUrl} />
  </section><LocalMeetingTitles meeting={meeting} published /></>;
  return <LocalMeetingTitles meeting={meeting} />;
}

function LocalMeetingTitles({meeting, published = false}: {meeting: Meeting; published?: boolean}) {
  const parts = meeting.parts.filter(part => !part.id.startsWith('co-') && (!published || (part.type !== 'Song' && part.type !== 'Music')));
  const [partId, setPartId] = useState(meeting.parts[0].id);
  const part = parts.find(item => item.id === partId) ?? parts[0];
  return <section className="settings-card">
    <h3>{t("Your meeting details")}</h3>
    <p>{published ? t('Add a speaker name without changing the published programme.') : <>{t("Add a public talk title")}{meeting.kind === 'weekend' ? t(" or the songs announced locally") : t(" or a local part title")}{t(". Saved only on this device, for this meeting.")}</>}</p>
    {meeting.parts.some(item => item.id.startsWith('co-')) && <p>{t('Edit visit talk titles and the overseer name under Circuit overseer visit.')}</p>}
    <label>{t("Meeting part")}<select value={part.id} onChange={event => setPartId(event.target.value)}>{parts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    {meeting.kind === 'weekend' && part.type === 'Song'
      ? <SongDetailsForm key={`${meeting.id}:${part.id}`} meetingId={meeting.id} part={part} />
      : <LocalTitleForm key={`${meeting.id}:${part.id}`} meetingId={meeting.id} part={part} published={published} />}
  </section>;
}
