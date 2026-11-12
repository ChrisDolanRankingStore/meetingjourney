import {t} from './i18n.ts';
import type { Meeting, MeetingPart, SavedNote, Stroke } from './types';
import type { MeetingDrawingRecord } from './storage';
import type { DrawingPaperSize } from './drawingViewport';
import type {DrawingArtwork} from './publishedArtwork';

export interface DiscoveryDrawing { page: number; strokes: Stroke[]; paper?: DrawingPaperSize; artwork?: DrawingArtwork; }
export interface DiscoveryTreasure {
  part: MeetingPart;
  partIndex: number;
  note?: SavedNote;
  drawings: DiscoveryDrawing[];
  position: { x: number; y: number };
}

const landmarks = {
  Opening: [{ x: 24, y: 86 }, { x: 39, y: 78 }],
  Treasures: [{ x: 48, y: 71 }, { x: 29, y: 64 }, { x: 36, y: 58 }],
  FieldMinistry: [{ x: 51, y: 53 }, { x: 65, y: 49 }, { x: 75, y: 43 }, { x: 80, y: 35 }],
  Living: [{ x: 78, y: 24 }, { x: 60, y: 23 }, { x: 43, y: 23 }],
  PublicTalk: [{ x: 48, y: 71 }],
  Programme: [{ x: 48, y: 71 }],
  Watchtower: [{ x: 65, y: 49 }, { x: 60, y: 23 }],
  Closing: [{ x: 31, y: 17 }, { x: 14, y: 11 }]
};

export function hasSavedDiscovery(note?: SavedNote) {
  return Boolean(note?.text?.trim() || note?.feedback?.trim() || note?.feedbackChoices?.some(choice => choice.trim()));
}

export function buildDiscoveryTreasures(meeting: Meeting, notes: (SavedNote | undefined)[], records: MeetingDrawingRecord[]): DiscoveryTreasure[] {
  const prefix = `${meeting.id}:`;
  const sectionOffsets: Record<string, number> = {};
  return meeting.parts.flatMap((part, partIndex) => {
    const offset = sectionOffsets[part.section] ?? 0;
    sectionOffsets[part.section] = offset + 1;
    const note = notes.find(item => item?.meetingId === meeting.id && item.partId === part.id);
    const drawings = records.flatMap(record => {
      if (!record.key.startsWith(prefix) || !Array.isArray(record.value) || !record.artwork&&!record.value.some(stroke => (stroke.mode === 'pen' || stroke.mode === 'highlighter'||stroke.mode==='fill') && stroke.points.length > 0)) return [];
      const suffix = record.key.slice(prefix.length);
      const extraPage = suffix.match(/^(.*)::page::(\d+)$/);
      const recordPart = extraPage ? extraPage[1] : suffix;
      return recordPart === part.id ? [{ page: extraPage ? Number(extraPage[2]) : 0, strokes: record.value, paper: record.paper,artwork:record.artwork }] : [];
    }).sort((left, right) => left.page - right.page);
    if (!hasSavedDiscovery(note) && drawings.length === 0) return [];
    const route = landmarks[part.section];
    return [{ part, partIndex, note, drawings, position: route[Math.min(offset, route.length - 1)] }];
  });
}

export function discoverySummary(treasure: DiscoveryTreasure): string {
  const content = [];
  if (treasure.note?.text?.trim()) content.push(t('a thought'));
  if (treasure.note?.feedback?.trim() || treasure.note?.feedbackChoices?.length) content.push(t('a reflection'));
  if (treasure.drawings.length) content.push(t(treasure.drawings.length === 1 ? '{count} drawing page' : '{count} drawing pages', {count: treasure.drawings.length}));
  return content.join(' · ');
}
