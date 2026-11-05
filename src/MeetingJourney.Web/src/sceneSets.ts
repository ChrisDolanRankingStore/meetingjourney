import type { MeetingSection } from './types';

export type SceneSeason = 'winter' | 'spring' | 'summer' | 'autumn';
export type SceneHemisphere = 'north' | 'south';
export const SCENE_HEMISPHERE_KEY='mj-scene-hemisphere';

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

export function readSceneHemisphere(storage?:Pick<Storage,'getItem'>):SceneHemisphere{
  try{
    const value=(storage??(typeof localStorage==='undefined'?undefined:localStorage))?.getItem(SCENE_HEMISPHERE_KEY);
    if(value===null||value===undefined)return 'north';
    if(value!=='north'&&value!=='south')throw Error('Invalid scenery hemisphere.');
    return value;
  }catch(error){console.warn('Could not read the scenery hemisphere; using Northern seasons.',error);return 'north';}
}

function sceneDate(value:string):Date{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Choose a valid date for the scenery.');
  const date=new Date(`${value}T12:00:00`);
  if(!Number.isFinite(date.valueOf())||date.getFullYear()!==Number(value.slice(0,4))||date.getMonth()+1!==Number(value.slice(5,7))||date.getDate()!==Number(value.slice(8,10)))throw Error('Choose a valid date for the scenery.');
  return date;
}

const seasons:SceneSeason[]=['winter','spring','summer','autumn'];
export function sceneSeasonForWeek(weekOf:string,hemisphere:SceneHemisphere=readSceneHemisphere()):SceneSeason{
  const month=sceneDate(weekOf).getMonth();
  const quarter=Math.floor(((month+1)%12)/3);
  return seasons[(quarter+(hemisphere==='south'?2:0))%4];
}

const worldLabels=['City riverside','Savannah village','Outback creek','Coastal village','Riverside park','Mountain garden'];
// Worlds with a completed set of standalone seasonal paintings. The weekly
// rotation uses only these until the remaining scene packs are finished.
const completedWorlds=[1];
export function sceneSetForWeek(weekOf:string,hemisphere:SceneHemisphere=readSceneHemisphere()):SceneSet{
  const date=sceneDate(weekOf);
  date.setDate(date.getDate()-(date.getDay()+6)%7);
  const monday=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const week=Math.floor((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-Date.UTC(2020,0,6))/604800000);
  const world=completedWorlds[((week%completedWorlds.length)+completedWorlds.length)%completedWorlds.length];
  const season=sceneSeasonForWeek(monday,hemisphere);
  const image=(view:string)=>`/assets/scene-${world}-${season}-${view}-v2.png`;
  const moments:Record<MeetingSection,SceneMoment>={
    Opening:{place:'The garden gate',symbol:'♫',focus:'Settle in. We can begin together.',x:45,image:image('gate')},
    Treasures:{place:'Beside the river',symbol:'◇',focus:'Listen for one thought you would like to keep.',x:54,image:image('river')},
    FieldMinistry:{place:'Across the bridge',symbol:'☏',focus:'What do you notice about how they speak?',x:56,image:image('bridge')},
    Living:{place:'The village path',symbol:'♡',focus:'Is there something here you could try?',x:53,image:image('village')},
    PublicTalk:{place:'Beside the river',symbol:'◇',focus:'Which idea from the talk would you like to keep?',x:54,image:image('river')},
    Programme:{place:'Beside the river',symbol:'◇',focus:'Listen for one thought you would like to keep.',x:54,image:image('river')},
    Watchtower:{place:'The village path',symbol:'♡',focus:'What did you notice in the study?',x:53,image:image('village')},
    Closing:{place:'The quiet garden',symbol:'✧',focus:'What would you like to take with you?',x:51,image:image('garden')}
  };
  return {id:`world-${world}-${season}`,label:worldLabels[world-1],season,available:true,
    homeImage:image('map'),discoveryImage:image('map'),discoveryDescription:'A painted journey through {location}.',
    backgroundPosition:'center',moments};
}

export function sceneAssetsForWeek(weekOf:string):string[]{
  const pack=sceneSetForWeek(weekOf);
  return [...new Set([pack.homeImage,pack.discoveryImage,...Object.values(pack.moments).map(moment=>moment.image)])];
}

export function sceneSeasonClass(weekOf:string):string{
  return `scene-season-${sceneSetForWeek(weekOf).season}`;
}
