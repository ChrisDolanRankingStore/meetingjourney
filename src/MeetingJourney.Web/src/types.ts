export type MeetingSection = 'Opening' | 'Treasures' | 'FieldMinistry' | 'Living' | 'PublicTalk' | 'Watchtower' | 'Closing' | 'Programme';
export type ProgrammePartType = 'Talk' | 'PublicTalk' | 'Symposium' | 'Baptism' | 'Experiences' | 'WatchtowerSummary' | 'ChairmanAddress' | 'Video' | 'MusicVideo' | 'Review' | 'Song' | 'Music';
export type ActivityType = 'ClueCards' | 'SpotTheClue' | 'DrawYourDiscovery' | 'MyThoughtBubble';

export interface ReferenceLink {
  label: string;
  url: string;
  note?: string;
}

export interface MeetingMaterialSection {
  id: string;
  heading: string;
  body: string;
  reference?: string;
  sourceUrl?: string;
}

export interface MeetingMaterial {
  title: string;
  introduction: string;
  sections: MeetingMaterialSection[];
  sourceUrl?: string;
  appUrl?: string;
}

export interface ClueMission {
  title: string;
  listeningObjective: string;
  clues: string[];
  scriptureReference?: string;
  answerSuggestions?: string[];
}

export interface EngagementActivity {
  id: string;
  type: ActivityType;
  title: string;
  prompt: string;
  mission?: ClueMission;
  drawingTemplate?: string;
}

export interface StudyGuide { paragraphCount: number; cues: { from: number; to: number; prompt: string; pointChoices?: string[] }[]; }

export interface MeetingPart {
  bingoWords?: {word:string;source:'passage'|'familiar'}[];
  activityNotice?: string;
  connections?: {reviewedAt: string; en: {title: string; sources: string[]; targets: string[]}; es: {title: string; sources: string[]; targets: string[]}};
  /** Optional original listening words supplied with the weekly outline. */
  listeningWords?: { en?: string[]; es?: string[] };
  /** Song details entered locally for this meeting. */
  songNumber?: number;
  songTitle?: string;
  speakerName?: string;
  studyGuide?: StudyGuide;
  id: string;
  number?: number;
  title: string;
  durationMinutes: number;
  programmeTime?: string;
  assemblyQuestion?: number;
  section: MeetingSection;
  type: string;
  summary: string;
  references: ReferenceLink[];
  activities: EngagementActivity[];
  /** Optional reviewed prompt and source links for a specific meeting stop. */
  question?: string;
  textReference?: string;
  researchUrl?: string;
  /** Optional deep link to the official meeting material for this stop. */
  appUrl?: string;
  sourceUrl?: string;
}

export interface Meeting {
  programmeMetadata?: {
    retrievedAt: string;
    sourceUrl: string;
    es: {bibleReading: string; parts: (Pick<MeetingPart, 'id' | 'title' | 'references'> & Partial<Pick<MeetingPart, 'appUrl' | 'sourceUrl' | 'songNumber' | 'bingoWords' | 'activityNotice'>>)[]};
  };
  id: string;
  kind?: 'midweek' | 'weekend' | 'assembly' | 'convention';
  eventDate?: string;
  contentStatus?: 'dated' | 'general';
  contentNotice?: string;
  weekOf: string;
  theme: string;
  bibleReading: string;
  material: MeetingMaterial;
  parts: MeetingPart[];
}

export interface SavedNote {
  meetingId: string;
  partId: string;
  text: string;
  feedback?: string;
  feedbackChoices?: string[];
  sourceConfirmations?: string[];
  updatedAt: string;
}

export interface Stroke {
  smooth?: boolean;
  points: number[];
  color: string;
  size: number;
  mode: 'pen' | 'highlighter' | 'eraser' | 'smudge';
}
