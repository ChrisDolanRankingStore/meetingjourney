import type {MeetingPart} from './types';

export function primaryPartAction(part: MeetingPart) {
  if (part.type === 'Song') return {label: 'Song reflection', tool: 'feelings'} as const;
  if (part.type === 'BibleReading') return {label: 'Before the reading', tool: 'listen'} as const;
  if (part.type === 'Demonstration') return {label: 'My thought bubble', tool: 'note'} as const;
  if (['WatchtowerStudy', 'CongregationBibleStudy'].includes(part.type)) return {label: 'Follow the study', tool: 'listen'} as const;
  if (['Comments', 'Prayer', 'Music'].includes(part.type)) return null;
  if (part.durationMinutes <= 15) return {label: 'Word bingo', tool: 'bingo'} as const;
  return {label: 'Follow the talk', tool: 'listen'} as const;
}

export function isNavigationKey(event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>, target: Element | null) {
  return !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey &&
    ['ArrowLeft', 'ArrowRight'].includes(event.key) &&
    !target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), dialog, [role="slider"], [role="radiogroup"]');
}
