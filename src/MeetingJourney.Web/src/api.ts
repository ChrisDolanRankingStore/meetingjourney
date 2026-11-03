import type { Meeting } from './types';
import {programmeImportEnabled} from './ProgrammeImport';

// In production the Node.js server and the browser client share one origin.
// Keep the API base configurable for local development, but use same-origin
// requests by default so the hosted app does not call localhost.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function loadMeeting(signal?: AbortSignal, kind?: 'midweek' | 'weekend', date?: string): Promise<Meeting> {
  const params=new URLSearchParams(kind&&date?{type:kind,date}:{});
  if(programmeImportEnabled())params.set('import','personal');
  const query = params.size?`?${params}`:'';
  const response = await fetch(`${API_BASE}/api/meetings/current${query}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Meeting request failed (${response.status})`);
  return response.json() as Promise<Meeting>;
}

export async function loadMeetingMonth(date: string, signal?: AbortSignal): Promise<Meeting[]> {
  const params=new URLSearchParams({date});
  if(programmeImportEnabled())params.set('import','personal');
  const response = await fetch(`${API_BASE}/api/meetings/month?${params}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Meeting month request failed (${response.status})`);
  const result = await response.json() as { month: string; meetings: Meeting[] };
  if (result.month !== date.slice(0, 7) || !Array.isArray(result.meetings)) throw new Error('Invalid meeting month');
  return result.meetings;
}
