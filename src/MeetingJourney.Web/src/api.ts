import type { Meeting } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:5080';

export async function loadMeeting(signal?: AbortSignal): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/api/meetings/current`, { signal });
  if (!response.ok) throw new Error(`Meeting request failed (${response.status})`);
  return response.json() as Promise<Meeting>;
}

