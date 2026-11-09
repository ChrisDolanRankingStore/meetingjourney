import type {MeetingPart} from './types';

const words = {
  en: ['Jehovah', 'Jesus', 'love', 'faith', 'hope', 'prayer', 'peace', 'kindness', 'joy', 'Bible', 'family', 'friends', 'help', 'listen', 'forgive', 'courage', 'Baruch', 'Jeremiah', 'Egypt', 'Paul', 'Philemon', 'Onesimus'],
  es: ['Jehová', 'Jesús', 'amor', 'fe', 'esperanza', 'oración', 'paz', 'bondad', 'alegría', 'Biblia', 'familia', 'amigos', 'ayuda', 'escuchar', 'perdonar', 'valor', 'Baruc', 'Jeremías', 'Egipto', 'Pablo', 'Filemón', 'Onésimo']
};
export function bingoSize(older: boolean): 3 | 4 { return older ? 4 : 3; }
export function bingoWords(part: MeetingPart, size: number, language: 'en' | 'es'): string[] {
  const text = [part.title, part.summary, part.question, part.textReference, ...part.activities.flatMap(activity => [activity.prompt, activity.mission?.listeningObjective, ...(activity.mission?.clues ?? [])])].join(' ').toLocaleLowerCase(language);
  const related = words[language].filter(word => new RegExp(`(?:^|[^\\p{L}])${word.toLocaleLowerCase(language)}(?:$|[^\\p{L}])`, 'u').test(text));
  const passage=(part.bingoWords??[]).filter(item=>item.source==='passage').map(item=>item.word);
  const limit=size===3?6:11;
  const familiar=[...related,...words[language]];
  const offset=[...part.id].reduce((sum,letter)=>sum+letter.charCodeAt(0),0)%familiar.length;
  const candidates = [...passage.slice(0,limit), ...(part.listeningWords?.[language] ?? []), ...familiar.slice(offset),...familiar.slice(0,offset),...passage.slice(limit)];
  const unique = new Map<string, string>();
  for (const word of candidates) {
    if (typeof word !== 'string' || !word.trim() || word.length > 60) continue;
    const label = word.trim();
    if (!unique.has(label.toLocaleLowerCase(language))) unique.set(label.toLocaleLowerCase(language), label);
  }
  return [...unique.values()].slice(0, size * size);
}
export function bingoLineCells(board: string[], selected: readonly string[], size: number): Set<string> {
  const lines: number[][] = [];
  for (let i = 0; i < size; i++) {
    lines.push(Array.from({length: size}, (_, j) => i * size + j));
    lines.push(Array.from({length: size}, (_, j) => j * size + i));
  }

  lines.push(Array.from({length: size}, (_, i) => i * size + i), Array.from({length: size}, (_, i) => i * size + size - 1 - i));
  return new Set(lines.filter(line => line.every(index => board[index] && selected.includes(board[index]))).flatMap(line => line.map(index => board[index])));
}

export type BingoSurprise = 'sparkle' | 'companion' | 'discovery';
export function bingoSurprise(board: readonly string[], previous: readonly string[], selected: readonly string[], companionAvailable: boolean, random = Math.random): BingoSurprise | null {
  if (!board.length || board.every(word => previous.includes(word)) || !board.every(word => selected.includes(word))) return null;
  const choices: BingoSurprise[] = companionAvailable ? ['sparkle', 'companion', 'discovery'] : ['sparkle', 'discovery'];
  return choices[Math.floor(random() * choices.length)];
}
