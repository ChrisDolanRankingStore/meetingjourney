import {t} from './i18n.ts';
import type { Meeting, MeetingPart } from './types';
import {sceneSetForWeek} from './sceneSets.ts';

const moments = {
  Opening: { place: 'The garden gate', symbol: '♫', focus: 'Settle in. We can begin together.', x: 45, image: '/assets/journey-gate-v1.png' },
  Treasures: { place: 'Beside the river', symbol: '◇', focus: 'Listen for one thought you would like to keep.', x: 54, image: '/assets/journey-river-v1.png' },
  FieldMinistry: { place: 'Across the bridge', symbol: '☏', focus: 'What do you notice about how they speak?', x: 56, image: '/assets/journey-bridge-v1.png' },
  Living: { place: 'The village path', symbol: '♡', focus: 'Is there something here you could try?', x: 53, image: '/assets/journey-village-v1.png' },
  PublicTalk: { place: 'Beside the river', symbol: '◇', focus: 'Which idea from the talk would you like to keep?', x: 54, image: '/assets/journey-river-v1.png' },
  Watchtower: { place: 'The village path', symbol: '♡', focus: 'What did you notice in the study?', x: 53, image: '/assets/journey-village-v1.png' },
  Closing: { place: 'The quiet garden', symbol: '✧', focus: 'What would you like to take with you?', x: 51, image: '/assets/journey-garden-v1.png' }
};

export function storyMoment(part: MeetingPart, weekOf?: string) {
  const moment = sceneSetForWeek(weekOf ?? new Date().toISOString().slice(0, 10)).moments[part.section];
  return { ...moment, place: t(moment.place), x: moment.x + ((part.number ?? 0) % 3) * 3, focus: t(part.type === 'Song' ? 'Which words in this song stand out to you?' : moment.focus) };
}

export function restoreMeetingPart(meeting: Meeting, storage: Pick<Storage, 'getItem'>): number {
  try {
    const savedPart = storage.getItem(`mj-place:${meeting.id}`);
    return Math.max(0, meeting.parts.findIndex(part => part.id === savedPart));
  } catch { return 0; }
}
