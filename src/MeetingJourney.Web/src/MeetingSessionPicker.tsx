import {t} from './i18n';
import type {MeetingSession} from './meetingSessions';

export function MeetingSessionPicker({value, onChange}: {value: MeetingSession; onChange: (session: MeetingSession) => void}) {
  return <div className="meeting-session-picker" role="group" aria-label={t('Programme session')}>
    <button type="button" aria-pressed={value === 'morning'} onClick={() => onChange('morning')}>{t('Morning')}</button>
    <button type="button" aria-pressed={value === 'afternoon'} onClick={() => onChange('afternoon')}>{t('Afternoon')}</button>
  </div>;
}
