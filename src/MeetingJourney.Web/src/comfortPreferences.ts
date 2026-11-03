export interface ComfortPreferences {
  neutral: boolean;
  hideCounts: boolean;
  iconLabels: boolean;
  showMinutes: boolean;
  textSize: 'standard' | 'large' | 'larger';
}
export const COMFORT_CHANGED = 'mj-comfort-change';
export function normalizeComfort(value: unknown): ComfortPreferences {
  const source = value && typeof value === 'object' ? value as Partial<ComfortPreferences> : {};
  return {neutral: source.neutral === true, hideCounts: source.hideCounts === true, iconLabels: source.iconLabels === true, showMinutes: source.showMinutes === true,
    textSize: source.textSize === 'large' || source.textSize === 'larger' ? source.textSize : 'standard'};
}
export function readComfort(storage?: Pick<Storage, 'getItem'>): ComfortPreferences {
  try { const target=storage??(typeof localStorage==='undefined'?undefined:localStorage);return normalizeComfort(JSON.parse(target?.getItem('mj-comfort') ?? 'null')); }
  catch (error) { console.warn('Could not read reading comfort preferences.', error); return normalizeComfort(null); }
}
export function saveComfort(value: ComfortPreferences, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem('mj-comfort', JSON.stringify(value));
}
export function insertStarter(draft: string, starter: string, start: number, end: number): {text: string; cursor: number} {
  const position = Math.max(0, Math.min(start, draft.length));
  const stop = Math.max(position, Math.min(end, draft.length));
  const insertion = `${position > 0 && !/\s$/.test(draft.slice(0, position)) ? ' ' : ''}${starter.replace(/[…\.]+$/, '')} `;
  // A starter never deletes even the selected text.
  const text = draft.slice(0, position) + insertion + draft.slice(position);
  if (text.length > 10000) throw Error('There is not enough room for this starter. Your words have not changed.');
  return {text, cursor: stop + insertion.length};
}
