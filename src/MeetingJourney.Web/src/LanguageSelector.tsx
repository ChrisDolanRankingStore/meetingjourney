import {t} from './i18n';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {getLanguage, LANGUAGE_CHANGED, setLanguage, type Language} from './i18n';
import {saveMeetingLanguage, type MeetingLanguageScope} from './meetingLanguage';
const subscribe = (listener: () => void) => {window.addEventListener(LANGUAGE_CHANGED, listener); return () => window.removeEventListener(LANGUAGE_CHANGED, listener);};
export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  useEffect(() => {document.documentElement.lang = language;}, [language]);
  return language;
}
export function LanguageSelector({compact = false, shortLabels = false, meeting}: {compact?: boolean; shortLabels?: boolean; meeting?: MeetingLanguageScope}) {
  const language = useLanguage();
  const [error, setError] = useState('');
  const label = meeting ? t('Language for this meeting') : t('Language / Idioma');
  return <div className={compact ? 'language-choice language-choice-compact' : 'settings-card language-choice'}>
    <label>{!compact && <span>{label}</span>}<select aria-label={label} value={language} onChange={event => {
      try {
        const next=event.target.value as Language;
        if(meeting)saveMeetingLanguage(meeting,next,localStorage);
        setLanguage(next);setError('');
      } catch {setError(t('Could not save on this device. Please try again.'));}
    }}><option value="en" lang="en">{shortLabels?'EN':'English'}</option><option value="es" lang="es">{shortLabels?'ES':'Español'}</option></select></label>
    {!compact&&meeting&&<p>{t('Remembered for this meeting and future meetings of this type on this device.')}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
