import type {ProgrammePartType} from './types';

export const programmePartLabels: Record<ProgrammePartType, string> = {
  Talk: 'Talk',
  PublicTalk: 'Public talk',
  Symposium: 'Symposium',
  Baptism: 'Baptism talk',
  Experiences: 'Experiences',
  WatchtowerSummary: 'Watchtower summary',
  ChairmanAddress: "Chairman's address",
  Video: 'Video presentation',
  MusicVideo: 'Music-video presentation',
  Review: 'Programme review',
  Song: 'Song',
  Music: 'Music'
};

export function programmePartLabel(type: string): string {
  return Object.entries(programmePartLabels).find(([key]) => key === type)?.[1] ?? 'Programme';
}

const listeningTypes = new Set(['WatchtowerStudy', 'CongregationBibleStudy', ...Object.keys(programmePartLabels).filter(key => key !== 'Song' && key !== 'Music' && key !== 'MusicVideo')]);

export function hasListeningTools(type: string): boolean { return listeningTypes.has(type); }
