import spanish from './data/spanishUi.json' with {type: 'json'};
export type Language = 'en' | 'es';
export const LANGUAGE_CHANGED = 'mj-language-changed';
export function translationKey(text: string) {
  return text.normalize('NFC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}
export function preferredLanguage(saved: string | null, languages: readonly string[] = []): Language {
  if (saved === 'en' || saved === 'es') return saved;
  return languages[0]?.toLowerCase().startsWith('es') ? 'es' : 'en';
}
export function getLanguage(): Language {
  let saved: string | null = null;
  try { if (typeof localStorage !== 'undefined') saved = localStorage.getItem('mj-language'); } catch {}
  return preferredLanguage(saved, typeof navigator === 'undefined' ? [] : navigator.languages);
}
export function setLanguage(language: Language) {
  // Persist before notifying React; a failed write leaves the current choice intact.
  localStorage.setItem('mj-language', language);
  window.dispatchEvent(new Event(LANGUAGE_CHANGED));
}
export function t<T>(value: T, params?: Record<string, unknown>, language = getLanguage()): T {
  if (typeof value !== 'string') return value;
  const translated = language === 'es' ? (spanish as Record<string, string>)[translationKey(value)] : undefined;
  let text = translated === undefined ? value : value.match(/^\s*/)?.[0] + translated + (value.match(/\s*$/)?.[0] ?? '');
  if (params) text = text.replace(/\{(\w+)\}/g, (match, name: string) => Object.hasOwn(params, name) ? String(params[name]) : match);
  return text as T;
}
export function tt(strings: TemplateStringsArray, ...values: unknown[]): string {
  const key = strings.reduce((text, fragment, index) => text + (index ? `{v${index - 1}}` : '') + fragment, '');
  return t(key, Object.fromEntries(values.map((value, index) => [`v${index}`, value])));
}
export function officialUrl(url?: string, language = getLanguage()): string | undefined {
  if (!url || language === 'en') return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'www.jw.org' && parsed.hostname !== 'wol.jw.org') return url;
    if (parsed.pathname.includes('finder')) {parsed.searchParams.set('wtlocale', 'S'); return parsed.href;}
    if (parsed.pathname.includes('/en/library/jw-meeting-workbook/')) return 'https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/';
    if (parsed.pathname.includes('/en/library/magazines/')) return 'https://www.jw.org/es/biblioteca/revistas/';
    if (parsed.pathname.includes('/en/jehovahs-witnesses/meetings/')) return 'https://www.jw.org/es/testigos-de-jehova/reuniones/';
    return url;
  } catch {return url;}
}

// Finder identifiers use a two-digit book, three-digit chapter and three-digit verse.
const bibleBookNumbers: Record<string, number> = {
  genesis: 1, exodus: 2, leviticus: 3, numbers: 4, deuteronomy: 5, joshua: 6, judges: 7, ruth: 8,
  '1 samuel': 9, '2 samuel': 10, '1 kings': 11, '2 kings': 12, '1 chronicles': 13, '2 chronicles': 14,
  ezra: 15, nehemiah: 16, esther: 17, job: 18, psalms: 19, psalm: 19, proverbs: 20,
  ecclesiastes: 21, 'song of solomon': 22, isaiah: 23, jeremiah: 24, lamentations: 25, ezekiel: 26,
  daniel: 27, hosea: 28, joel: 29, amos: 30, obadiah: 31, jonah: 32, micah: 33, nahum: 34,
  habakkuk: 35, zephaniah: 36, haggai: 37, zechariah: 38, malachi: 39, matthew: 40, mark: 41,
  luke: 42, john: 43, acts: 44, romans: 45, '1 corinthians': 46, '2 corinthians': 47,
  galatians: 48, ephesians: 49, philippians: 50, colossians: 51, '1 thessalonians': 52,
  '2 thessalonians': 53, '1 timothy': 54, '2 timothy': 55, titus: 56, philemon: 57,
  hebrews: 58, james: 59, '1 peter': 60, '2 peter': 61, '1 john': 62, '2 john': 63,
  '3 john': 64, jude: 65, revelation: 66,
  génesis: 1, éxodo: 2, levítico: 3, números: 4, deuteronomio: 5, josué: 6, jueces: 7, rut: 8,
  '1 reyes': 11, '2 reyes': 12, '1 crónicas': 13, '2 crónicas': 14, esdras: 15, nehemías: 16,
  ester: 17, salmos: 19, proverbios: 20, eclesiastés: 21, 'cantar de los cantares': 22,
  isaías: 23, jeremías: 24, lamentaciones: 25, ezequiel: 26, oseas: 28, amós: 30,
  abdías: 31, jonás: 32, miqueas: 33, nahúm: 34, habacuc: 35, sofonías: 36, ageo: 37,
  zacarías: 38, malaquías: 39, mateo: 40, marcos: 41, lucas: 42, juan: 43, hechos: 44,
  romanos: 45, '1 corintios': 46, '2 corintios': 47, gálatas: 48, efesios: 49, filipenses: 50,
  colosenses: 51, '1 tesalonicenses': 52, '2 tesalonicenses': 53, '1 timoteo': 54, '2 timoteo': 55,
  tito: 56, filemón: 57, hebreos: 58, santiago: 59, '1 pedro': 60, '2 pedro': 61,
  '1 juan': 62, '2 juan': 63, '3 juan': 64, judas: 65, apocalipsis: 66
};
const bibleAbbreviations = [
  'gen ge gn gén', 'ex exo éx', 'lev le lv', 'num nu nm núm', 'deut de dt', 'josh jos', 'judg jdg jue', 'ru rt',
  '1 sam sa', '2 sam sa', '1 ki kgs re', '2 ki kgs re', '1 chr ch cr', '2 chr ch cr', 'ezr esd', 'neh ne', 'est es', 'jb',
  'ps psa sal', 'prov pr pro', 'eccl ecc ec', 'song sos cant can', 'isa is', 'jer je', 'lam la', 'ezek eze ez', 'dan da dn',
  'hos ho os', 'jl', 'am', 'obad ob abd ab', 'jon jnh jonás', 'mic mi', 'nah na', 'hab', 'zeph zep sof', 'hag hág ag', 'zech zec zac', 'mal',
  'matt mt mat', 'mark mk mr mar', 'luke lk lu lc', 'jn joh jn juan', 'ac act hch hech', 'rom ro rm',
  '1 cor co', '2 cor co', 'gal ga gál', 'eph ep ef', 'phil php flp fi fili fl', 'col', '1 thess th tes', '2 thess th tes',
  '1 tim ti', '2 tim ti', 'tit', 'philem phm flm', 'heb he', 'jas jam sant stg', '1 pet pe ped', '2 pet pe ped',
  '1 jn joh', '2 jn joh', '3 jn joh', 'jud jd', 'rev re ap apoc'
];
for(const [index,entry] of bibleAbbreviations.entries()){
  const [prefix,...aliases]=entry.split(' ');
  for(const alias of /^\d$/.test(prefix)?aliases:entry.split(' ')){
    bibleBookNumbers[/^\d$/.test(prefix)?`${prefix} ${alias}`:alias]=index+1;
  }
}

function bibleBookKey(value: string) {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function biblePassageUrl(bible: string, language: Language) {
  return `https://www.jw.org/finder?srcid=jwlshare&wtlocale=${language === 'es' ? 'S' : 'E'}&prefer=lang&pub=nwtsty&bible=${bible}`;
}

const bookChapters = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
const scriptureCode = (book: number, chapter: number, verse: number) => `${String(book).padStart(2,'0')}${String(chapter).padStart(3,'0')}${String(verse).padStart(3,'0')}`;
const bookPattern = Object.keys(bibleBookNumbers).sort((a,b) => b.length-a.length).map(name=>name.replace(/ /g,'\\s*')).join('|');

export function bibleReferenceLinks(reference?: string, language = getLanguage()): { label: string; url: string }[] {
  if (!reference?.trim()) return [];
  const links: { label: string; url: string }[] = [];
  const text = reference.normalize('NFC').replace(/\s+/g,' ');
  const pattern = new RegExp(`(?<![\\p{L}\\d])(${bookPattern})\\.?\\s*(?=\\d)`, 'giu');
  const matches = [...text.matchAll(pattern)];
  for (const [position, match] of matches.entries()) {
    const bookName = match[1];
    const book = bibleBookNumbers[bibleBookKey(bookName).replace(/^([1-3])(?=\p{L})/u,'$1 ')];
    let chapter = 0, verses = false;
    const numeric = text.slice(match.index+match[0].length,matches[position+1]?.index).match(/^\d[\d\s:.,;\-–—]*/)?.[0] ?? '';
    const clauses = numeric.trim().replace(/\.+$/,'').replace(/\./g,':').replace(/\s*:\s*/g,':').replace(/[–—]/g,'-').split(/([,;])/);
    for (const [index, clause] of clauses.entries()) {
      if (index % 2) continue;
      const separator = index ? clauses[index-1] : '';
      const part = clause.trim().match(/^(?:(\d{1,3}):)?(\d{1,3})(?:\s*-\s*(?:(\d{1,3}):)?(\d{1,3}))?$/);
      if (!part) continue;
      if (part[1]) { chapter = Number(part[1]); verses = true; }
      else if (separator !== ',' || !verses) { chapter = Number(part[2]); verses = false; }
      const start = verses ? Number(part[2]) : 0;
      const endChapter = part[3] ? Number(part[3]) : verses ? chapter : Number(part[4] ?? chapter);
      const end = verses ? Number(part[4] ?? start) : 0;
      if (chapter < 1 || endChapter > bookChapters[book-1] || endChapter < chapter ||
          start > 176 || end > 176 || (verses && (!start || !end || (endChapter === chapter && end < start))) || (!verses && part[3])) continue;
      if (!verses) {
        for (let current = chapter; current <= endChapter; current++) {
          links.push({label:`${bookName} ${current}`,url:biblePassageUrl(scriptureCode(book,current,0),language)});
        }
      } else {
        const from = scriptureCode(book,chapter,start), to = scriptureCode(book,endChapter,end);
        const suffix = from === to ? '' : `–${endChapter === chapter ? '' : `${endChapter}:`}${end}`;
        links.push({label:`${bookName} ${chapter}:${start}${suffix}`,url:biblePassageUrl(from === to ? from : `${from}-${to}`,language)});
        chapter = endChapter;
      }
    }
  }
  return links.filter((link,index) => links.findIndex(other => other.url === link.url) === index);
}

export function jwLibraryUrl(url?: string, language = getLanguage()): string | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return undefined; }
  const finder = parsed.protocol === 'jwlibrary:' && parsed.pathname === '/finder';
  if (!finder && (parsed.protocol !== 'https:' || !['www.jw.org','jw.org','wol.jw.org'].includes(parsed.hostname))) return undefined;
  const params = new URLSearchParams(parsed.search);
  if (!finder && !/^\/(?:finder|open)\/?$/.test(parsed.pathname)) {
    const document = parsed.hostname === 'wol.jw.org' ? parsed.pathname.match(/\/wol\/d\/[^/]+\/[^/]+\/(\d+)\/?$/)?.[1] : undefined;
    if (!document) return undefined;
    params.set('docid',document);
  }
  if (!['bible','docid','pub','lank'].some(key => params.has(key))) return undefined;
  params.set('wtlocale',language === 'es' ? 'S' : 'E');
  return `jwlibrary:///finder?${params.toString()}${parsed.hash}`;
}

export function jwLibraryHandoffUrl(url?: string, language = getLanguage()): string | undefined {
  const app = jwLibraryUrl(url, language);
  // The official /finder HTTPS route is registered for app links and also works on the web.
  return app ? app.replace('jwlibrary:///finder?', 'https://www.jw.org/finder?') : officialUrl(url, language);
}
