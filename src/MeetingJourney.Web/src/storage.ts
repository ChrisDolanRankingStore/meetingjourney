import type { SavedNote, Stroke } from './types';

const DB_NAME = 'meeting-journey-local';
const DB_VERSION = 1;
const NOTE_STORE = 'notes';
const DRAWING_STORE = 'drawings';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTE_STORE)) db.createObjectStore(NOTE_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(DRAWING_STORE)) db.createObjectStore(DRAWING_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const keyFor = (meetingId: string, partId: string) => `${meetingId}:${partId}`;

export async function readNote(meetingId: string, partId: string): Promise<SavedNote | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(NOTE_STORE).objectStore(NOTE_STORE).get(keyFor(meetingId, partId));
    request.onsuccess = () => resolve(request.result?.value as SavedNote | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveNote(note: SavedNote): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(NOTE_STORE, 'readwrite').objectStore(NOTE_STORE).put({ key: keyFor(note.meetingId, note.partId), value: note });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function readDrawing(meetingId: string, partId: string): Promise<Stroke[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DRAWING_STORE).objectStore(DRAWING_STORE).get(keyFor(meetingId, partId));
    request.onsuccess = () => resolve((request.result?.value as Stroke[] | undefined) ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDrawing(meetingId: string, partId: string, strokes: Stroke[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DRAWING_STORE, 'readwrite').objectStore(DRAWING_STORE).put({ key: keyFor(meetingId, partId), value: strokes });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
