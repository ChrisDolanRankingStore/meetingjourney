export type MeetingKind = 'midweek' | 'weekend';
export interface MeetingDays { midweek: number; weekend: number; }
export interface MeetingSelection { type: MeetingKind; date: string; }
export interface MeetingOverride extends MeetingSelection { chosenOn: string; }
export const defaultMeetingDays: MeetingDays;
export function localDateKey(date?: Date): string;
export function parseCalendarDate(value: string): Date;
export function weekOfDate(value: string): string;
export function monthWeeks(value: string): string[];
export function normaliseMeetingDays(days?: Partial<MeetingDays> | null): MeetingDays;
export function suggestedMeeting(today?: string, days?: MeetingDays): MeetingSelection;
export function resolveMeetingSelection(today: string, days: MeetingDays, override?: MeetingOverride | null): MeetingSelection;
