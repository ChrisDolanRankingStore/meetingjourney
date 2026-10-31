import catalog from './data/songCatalog.json' with {type: 'json'};
import type {Language} from './i18n.ts';
export type SongMetadata = {title: string; url: string; appUrl?: string};
export function lookupSong(number: string | number | null | undefined, language: Language): SongMetadata | undefined {
  const value = String(number ?? '').trim();
  if (!/^\d{1,3}$/.test(value) || Number(value) < 1) return undefined;
  return (catalog.songs[language] as Record<string, SongMetadata>)[Number(value)];
}
export function songbookUrl(language: Language) {return catalog.sources[language];}
export function songNumberFromTitle(title: string): number | undefined {
  const match = title.match(/^(?:Song|Canción)\s+(\d+)\b/i);
  return match ? Number(match[1]) : undefined;
}
