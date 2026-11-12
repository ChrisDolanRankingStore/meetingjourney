import type { SavedNote, Stroke } from './types';
import type { DrawingPaperSize } from './drawingViewport';
import {validDrawingArtwork,type DrawingArtwork} from './publishedArtwork.ts';

const DB_NAME = 'meeting-journey-local';
const DB_VERSION = 2;
const NOTE_STORE = 'notes';
const DRAWING_STORE = 'drawings';
const pendingSaves = new Map<string,Promise<void>>();
export function trackJournalSave(save: Promise<void>, key: string): Promise<void> {
  pendingSaves.set(key,save);
  void save.then(() => {if(pendingSaves.get(key)===save)pendingSaves.delete(key);}, () => undefined);
  return save;
}
export async function waitForJournalSaves() { await Promise.all([...pendingSaves.values()]); }

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTE_STORE)) db.createObjectStore(NOTE_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(DRAWING_STORE)) db.createObjectStore(DRAWING_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains('engagement')) db.createObjectStore('engagement', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other Meeting Journey tabs and try again.'));
  });
}

const keyFor = (meetingId: string, partId: string) => `${meetingId}:${partId}`;

export async function readNote(meetingId: string, partId: string): Promise<SavedNote | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(NOTE_STORE).objectStore(NOTE_STORE).get(keyFor(meetingId, partId));
    request.onsuccess = () => { db.close(); resolve(request.result?.value as SavedNote | undefined); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export function saveNote(note: SavedNote) { return trackJournalSave(writeNote(note),`notes:${keyFor(note.meetingId,note.partId)}`); }
async function writeNote(note: SavedNote): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(NOTE_STORE, 'readwrite');
    transaction.objectStore(NOTE_STORE).put({ key: keyFor(note.meetingId, note.partId), value: note });
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export async function readDrawing(meetingId: string, partId: string): Promise<Stroke[]> {
  return (await readDrawingPage(meetingId, partId)).strokes;
}

export async function readDrawingPage(meetingId: string, partId: string): Promise<{ strokes: Stroke[]; paper?: DrawingPaperSize; artwork?: DrawingArtwork }> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(DRAWING_STORE).objectStore(DRAWING_STORE).get(keyFor(meetingId, partId));
    request.onsuccess = () => {
      const paper = request.result?.paper as DrawingPaperSize | undefined;
      db.close();
      if(request.result?.artwork!==undefined&&!validDrawingArtwork(request.result.artwork)){reject(Error('The saved outline is invalid.'));return;}
      resolve({ strokes: (request.result?.value as Stroke[] | undefined) ?? [], paper: paper && paper.width > 0 && paper.height > 0 && Number.isFinite(paper.width) && Number.isFinite(paper.height) ? paper : undefined,artwork:request.result?.artwork });
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export function saveDrawing(meetingId: string, partId: string, strokes: Stroke[], paper?: DrawingPaperSize, artwork?: DrawingArtwork) { return trackJournalSave(writeDrawing(meetingId, partId, strokes, paper,artwork),`drawings:${keyFor(meetingId,partId)}`); }
async function writeDrawing(meetingId: string, partId: string, strokes: Stroke[], paper?: DrawingPaperSize, artwork?: DrawingArtwork): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DRAWING_STORE, 'readwrite');
    transaction.objectStore(DRAWING_STORE).put({ key: keyFor(meetingId, partId), value: strokes, paper, artwork, updatedAt: new Date().toISOString() });
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export interface MeetingDrawingRecord {
  key: string;
  value: Stroke[];
  paper?: DrawingPaperSize;
  artwork?: DrawingArtwork;
}

export async function readMeetingDrawings(meetingId: string): Promise<MeetingDrawingRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const prefix = `${meetingId}:`;
    const request = db.transaction(DRAWING_STORE).objectStore(DRAWING_STORE).getAll(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
    request.onsuccess = () => { db.close(); resolve(request.result as MeetingDrawingRecord[]); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
