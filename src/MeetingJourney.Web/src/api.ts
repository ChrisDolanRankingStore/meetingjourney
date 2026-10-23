import type { Meeting } from './types';

// In production the Node.js server and the browser client share one origin.
// Keep the API base configurable for local development, but use same-origin
// requests by default so the hosted app does not call localhost.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export async function loadMeeting(signal?: AbortSignal): Promise<Meeting> {
  const response = await fetch(`${API_BASE}/api/meetings/current`, { signal });
  if (!response.ok) throw new Error(`Meeting request failed (${response.status})`);
  return response.json() as Promise<Meeting>;
}

