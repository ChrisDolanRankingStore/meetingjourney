import {t} from './i18n';
import {useState, type CSSProperties} from 'react';
import {focusLandscape, sceneImage, portraitImage} from './artwork';
import {sceneAssetsForWeek} from './sceneSets';
import {paintedIconAssets} from './paintedIcons';
import type {Meeting} from './types';
import {ProgrammeImport,programmeImportEnabled} from './ProgrammeImport';

export function OfflineMeeting({meeting, portrait}: {meeting: Meeting; portrait: string}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setStatus('Saving this meeting…');
    try {
      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active;
      if (!worker) throw Error('Reopen the app online and try again.');
      const sceneSources = sceneAssetsForWeek(meeting.weekOf);
      const urls = [...new Set([
        focusLandscape,
        ...paintedIconAssets,
        ...sceneSources.flatMap(source => [480, 960].map(width => sceneImage(source, width))),
        ...sceneSources.map(source => sceneImage(source, 1600)),
        ...[180, 360, 720].map(height => portraitImage(portrait, height)),
        ...(meeting.kind === 'assembly' || meeting.kind === 'convention' ? [] : [`/api/meetings/current?${new URLSearchParams({type: meeting.kind ?? 'midweek', date: meeting.weekOf,...(programmeImportEnabled()?{import:'personal'}:{})})}`])
      ])];
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();
        const timeout = setTimeout(() => { channel.port1.close(); reject(Error('The download took too long. Try again on a stronger connection.')); }, 120000);
        channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); event.data.ok ? resolve() : reject(Error('Some items could not be saved. Try again while online.')); };
        worker.postMessage({type: 'SAVE_MEETING', urls}, [channel.port2]);
      });
      setStatus('Meeting, scenery and your companion are saved for offline use. JW Library material is managed separately in that app.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save for offline use.');
    } finally { setBusy(false); }
  };
  return <><ProgrammeImport /><section className="settings-card"><h3>{t('Ready without a connection')}</h3><p>{t('The chosen companion and scenery prepare in the background when connected. Use this button to save or retry the meeting pack. Official reading material opens separately in JW Library.')}</p><button disabled={busy || !('serviceWorker' in navigator)} onClick={() => void save()}>{t('Save this meeting offline')}</button><p role="status">{t(status)}</p></section></>;
}

export function DisplaySettings() {
  const [theme, setTheme] = useState(() => localStorage.getItem('mj-theme') ?? 'painted');
  const [font, setFont] = useState(() => localStorage.getItem('mj-font') ?? 'system');
  const [palette, setPalette] = useState(() => localStorage.getItem('mj-palette') ?? 'journey');
  const choose = (key: string, value: string) => { localStorage.setItem(key, value); window.dispatchEvent(new Event('mj-display-change')); };
  const palettes = [{id: 'journey', label: 'Journey blue', detail: 'The original Meeting Journey colours', swatch: '#5b61d6'}, {id: 'ocean', label: 'Calm ocean', detail: 'Cool blue and teal', swatch: '#2e77b7'}, {id: 'meadow', label: 'Meadow green', detail: 'Soft green and earth tones', swatch: '#548f67'}, {id: 'sunset', label: 'Warm sunset', detail: 'Gentle plum and amber', swatch: '#9b5ea0'}, {id: 'high-contrast', label: 'High contrast', detail: 'Strongest text and focus colours', swatch: '#123f8c'}] as const;
  return <section className="settings-card">
    <h3>{t('Scene and reading comfort')}</h3>
    <label>{t('Reading treatment')}<select value={theme} onChange={event => { setTheme(event.target.value); choose('mj-theme', event.target.value); }}><option value="painted">{t('Full colour')}</option><option value="soft">{t('Soft')}</option><option value="plain">{t('Plain')}</option></select></label>
    <label>{t('Text')}<select value={font} onChange={event => { setFont(event.target.value); choose('mj-font', event.target.value); }}><option value="system">{t('System')}</option><option value="readable">{t('Spacious, clear text')}</option></select></label>
    <fieldset className="palette-picker"><legend>{t('Colour scheme')}</legend><div className="palette-options">{palettes.map(option => <button key={option.id} type="button" className={`palette-option ${palette === option.id ? 'selected' : ''}`} aria-pressed={palette === option.id} onClick={() => { setPalette(option.id); choose('mj-palette', option.id); }}><span className="palette-swatch" style={{'--palette-swatch': option.swatch} as CSSProperties} /><span><strong>{t(option.label)}</strong><small>{t(option.detail)}</small></span></button>)}</div><small className="settings-help">{t('Your choice stays on this device and can be changed at any time.')}</small></fieldset>
  </section>;
}
