export const interestLenses = ['Maps', 'Animals', 'Numbers', 'People', 'Food', 'Buildings', 'Feelings'] as const;
export type InterestLens = typeof interestLenses[number];
export interface ListeningPreferences { lenses: InterestLens[]; pauseEvery: number; haptics: boolean; }
export function normalizeListeningPreferences(value: unknown): ListeningPreferences {
  const source = value && typeof value === 'object' ? value as Partial<ListeningPreferences> : {};
  return {
    lenses: Array.isArray(source.lenses) ? [...new Set(source.lenses.filter(lens => interestLenses.includes(lens)))].slice(0, 2) : [],
    pauseEvery: [0, 3, 5, 7].includes(source.pauseEvery ?? 0) ? source.pauseEvery ?? 0 : 0,
    haptics: source.haptics === true
  };
}
export function readListeningPreferences(): ListeningPreferences {
  try { return normalizeListeningPreferences(JSON.parse(localStorage.getItem('mj-listening-preferences') ?? 'null')); }
  catch { return normalizeListeningPreferences(null); }
}
export function pauseBoundary(previous: number, next: number, every: number): boolean {
  return every > 0 && next > previous && Math.floor((next - 1) / every) > Math.floor((previous - 1) / every);
}
export function allowsComments(type: string): boolean { return ['WatchtowerStudy', 'CongregationBibleStudy'].includes(type); }
export function localRehearsalVoices<T extends {localService: boolean; lang: string}>(voices: T[], language: string): T[] {
  return voices.filter(voice => voice.localService && voice.lang.toLowerCase().split('-')[0] === language);
}
export function appendListeningPoint(draft: string | undefined, point: string): string {
  if (!draft?.trim()) return point;
  return draft.includes(point) ? draft : `${draft.trimEnd()}\n${point}`.slice(0, 10000);
}
export const lensPrompts: Record<InterestLens, string> = {
  Maps: 'If you hear a place, imagine where it is or sketch a route.',
  Animals: 'If an animal is mentioned, notice what it helps explain.',
  Numbers: 'Notice a number or count a repeated idea.',
  People: 'Notice who is involved and a choice they make.',
  Food: 'If food is mentioned, notice how people share or care for one another.',
  Buildings: 'If a building is mentioned, picture how it is used.',
  Feelings: 'Notice how someone might feel and what could help.'
};
