import type {Meeting} from './types';

export type MeetingSession = 'morning' | 'afternoon';
export function hasDaySessions(meeting: Meeting): boolean {
  return (meeting.kind === 'assembly' || meeting.kind === 'convention') && meeting.parts.some(part => part.id === 'afternoon-music');
}
export function sessionForPart(meeting: Meeting, index: number): MeetingSession {
  const start = meeting.parts.findIndex(part => part.id === 'afternoon-music');
  return start >= 0 && index >= start ? 'afternoon' : 'morning';
}
export function sessionPartIndices(meeting: Meeting, session: MeetingSession): number[] {
  return meeting.parts.flatMap((_, index) => !hasDaySessions(meeting) || sessionForPart(meeting,index) === session ? [index] : []);
}
export function sessionMapPoint(index: number, count: number) {
  const row = Math.floor(index / 2), rows = Math.ceil(count / 2);
  return {x:index % 2 === 0 ? 25 : 75, y:8 + row * 84 / Math.max(1,rows-1)};
}
