import type {MeetingPart} from './types';

export const connectionSources = ['Time', 'Encouragement', 'Practical help', 'Spiritual things'];
export const connectionTargets = ['Visit someone who is unwell', 'Offer to help with a practical task', 'Share a scripture', 'Give a listening ear'];

const activities = [
  {meetingId:'meeting-2026-10-19',partId:'part-8',title:'How can we share with others?',sources:connectionSources,targets:connectionTargets},
  {meetingId:'meeting-2026-10-26',partId:'part-1',title:'Notice justice and mercy',sources:['Justice','Mercy','Hope','Humility'],targets:['Notice why wrongdoing matters','Notice compassion for those who suffer','Look for a promise of restoration','Avoid looking down on others']},
  {meetingId:'weekend-2026-10-26',partId:'watchtower-study',title:'Connect service with everyday life',sources:['Gratitude','Courage','Encouragement','Sharing'],targets:['Value the opportunity to serve','Take a small step despite feeling afraid','Help someone who feels unworthy','Offer someone a helpful thought']}
];

export const generalConnections = {
  title:'Connect something you noticed',
  sources:['An idea I heard','A scripture I noticed','A quality I noticed','An action I noticed'],
  targets:['Something I already knew','Something new to me','Something I could try','Something to think about']
};

export function connectionActivityFor(meetingId: string, partId: string, part?: MeetingPart) {
  return part?.connections?.en ?? activities.find(activity => activity.meetingId === meetingId && activity.partId === partId) ?? generalConnections;
}

export function hasConnectIdeas(meetingId: string, part: MeetingPart) {
  return Boolean(connectionActivityFor(meetingId, part.id, part));
}

export function validConnectionChoice(meetingId: string, partId: string, source: string, target: string) {
  const activity = activities.find(activity=>activity.meetingId===meetingId&&activity.partId===partId.replace(/:connections$/, ''));
  return activity ? activity.sources.includes(source) && (target === '' || activity.targets.includes(target)) : source.trim().length > 0 && source.length <= 300 && target.length <= 300;
}
