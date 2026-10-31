import type { Meeting } from '../src/MeetingJourney.Web/src/types';
import type { MeetingKind } from './meeting-schedule';
export function getMeeting(kind: MeetingKind, date: string): Meeting;
