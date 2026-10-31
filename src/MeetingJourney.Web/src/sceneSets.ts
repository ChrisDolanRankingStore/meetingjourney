import type { MeetingSection } from './types';

export type SceneSeason = 'winter' | 'spring' | 'summer' | 'autumn';

export interface SceneMoment {
  place: string;
  symbol: string;
  focus: string;
  x: number;
  image: string;
}

export interface SceneSet {
  id: string;
  label: string;
  season: SceneSeason;
  available: boolean;
  homeImage: string;
  discoveryImage: string;
  discoveryDescription: string;
  backgroundPosition: string;
  moments: Record<MeetingSection, SceneMoment>;
}

const currentMoments: Record<MeetingSection, SceneMoment> = {
  Opening: { place: 'The garden gate', symbol: '♫', focus: 'Settle in. We can begin together.', x: 45, image: '/assets/journey-gate-v1.png' },
  Treasures: { place: 'Beside the river', symbol: '◇', focus: 'Listen for one thought you would like to keep.', x: 54, image: '/assets/journey-river-v1.png' },
  FieldMinistry: { place: 'Across the bridge', symbol: '☏', focus: 'What do you notice about how they speak?', x: 56, image: '/assets/journey-bridge-v1.png' },
  Living: { place: 'The village path', symbol: '♡', focus: 'Is there something here you could try?', x: 53, image: '/assets/journey-village-v1.png' },
  PublicTalk: { place: 'Beside the river', symbol: '◇', focus: 'Which idea from the talk would you like to keep?', x: 54, image: '/assets/journey-river-v1.png' },
  Programme: { place: 'Beside the river', symbol: '◇', focus: 'Listen for one thought you would like to keep.', x: 54, image: '/assets/journey-river-v1.png' },
  Watchtower: { place: 'The village path', symbol: '♡', focus: 'What did you notice in the study?', x: 53, image: '/assets/journey-village-v1.png' },
  Closing: { place: 'The quiet garden', symbol: '✧', focus: 'What would you like to take with you?', x: 51, image: '/assets/journey-garden-v1.png' }
};

function seasonForDate(value: string | Date): SceneSeason {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  const month = date.getMonth();
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

export function sceneSeasonForWeek(weekOf: string): SceneSeason {
  return seasonForDate(weekOf);
}

export function sceneSetForWeek(weekOf: string): SceneSet {
  const date = new Date(`${weekOf}T12:00:00`);
  if (!Number.isFinite(date.valueOf())) throw new Error('Choose a valid date for the scenery.');
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  const monday = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const week = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(2020,0,6)) / 604800000);
  const season = sceneSeasonForWeek(monday);
  const variation = ((week % 5) + 5) % 5;
  const homeViews = ['gate', 'river', 'bridge', 'village', 'garden'];
  return {id:`painted-${season}-${variation+1}`, season, available:true, backgroundPosition:'center 30%',
    label:'Painted valley', homeImage:`/assets/journey-${homeViews[variation]}-v1.png`,
    discoveryImage:'/assets/journey-discovery-map-v1.png',
    discoveryDescription:'A painted journey through the valley.',
    moments:{...currentMoments}};
}

export function sceneAssetsForWeek(weekOf: string): string[] {
  const pack = sceneSetForWeek(weekOf);
  return [...new Set([pack.homeImage, pack.discoveryImage, ...Object.values(pack.moments).map(moment => moment.image)])];
}

export function sceneSeasonClass(weekOf: string): string {
  return `scene-season-${sceneSetForWeek(weekOf).season}`;
}
