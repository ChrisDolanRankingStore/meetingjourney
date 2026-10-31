import type {MeetingPart} from './types';

export const connectionSources = ['Time', 'Encouragement', 'Practical help', 'Spiritual things'];
export const connectionTargets = ['Visit someone who is unwell', 'Offer to help with a practical task', 'Share a scripture', 'Give a listening ear'];

export function hasConnectIdeas(meetingId: string, part: MeetingPart) {
  return meetingId === 'meeting-2026-10-19' && part.id === 'part-8';
}
