import {IllustratedIcon, type IllustratedIconName} from './IllustratedIcon';
import {NotebookIcon} from './NotebookIcon';
import {t} from './i18n';
import type {MeetingPart} from './types';
import {hasConnectIdeas} from './connectionActivity';

export type PartActivityChoice = {kind: 'bingo' | 'connections' | 'doodle' | 'spot'} | {kind: 'supplied'; index: number};

export function PartActivities({meetingId, part, quiet, onChoose}: {
  meetingId: string;
  part: MeetingPart;
  quiet: boolean;
  onChoose: (choice: PartActivityChoice) => void;
}) {
  const card = (key: string, choice: PartActivityChoice, icon: IllustratedIconName, title: string, description: string) =>
    <button type="button" key={key} onClick={() => onChoose(choice)}>
      <IllustratedIcon name={icon} /><span><strong>{t(title)}</strong><small>{t(description)}</small></span><NotebookIcon name="next" />
    </button>;
  return <nav className="part-activities" aria-label={t('Activities for this part')}>
    {!quiet && card('bingo', {kind:'bingo'}, 'question', 'Word bingo', 'Listen for words at your own pace.')}
    {hasConnectIdeas(meetingId, part) && card('connections', {kind:'connections'}, 'connect', 'Connect the ideas', 'Match related ideas with examples.')}
    {!quiet && part.activities.map((activity, index) => card(activity.id, {kind:'supplied', index},
      activity.type === 'DrawYourDiscovery' ? 'notes' : activity.type === 'MyThoughtBubble' ? 'thought' : 'clue',
      activity.title, activity.prompt))}
    {!quiet && part.type === 'Demonstration' && !part.activities.some(activity => activity.type === 'SpotTheClue') &&
      card('spot', {kind:'spot'}, 'clue', 'Spot the clue', 'Watch how the speaker listens, asks a question or shows kindness.')}
    {(quiet || !part.activities.some(activity => activity.type === 'DrawYourDiscovery')) &&
      card('doodle', {kind:'doodle'}, 'notes', 'Doodle notes', 'Draw or write what you notice.')}
  </nav>;
}
