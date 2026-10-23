export type MeetingSection = 'Opening' | 'Treasures' | 'FieldMinistry' | 'Living' | 'Closing';
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

export interface MeetingPart {
  id: string;
  number?: number;
  title: string;
  durationMinutes: number;
  section: MeetingSection;
  type: string;
  summary: string;
  references: ReferenceLink[];
  activities: EngagementActivity[];
}

export interface Meeting {
  id: string;
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
  points: number[];
  color: string;
  size: number;
  mode: 'pen' | 'highlighter' | 'eraser';
}
