import {portraitImage} from './artwork';
/** The complete illustration includes any glasses or carried item. Nothing is positioned over a face. */
export function CompanionPortrait({asset,resolution=360}:{asset:string;resolution?:number}) {
  return <img className="companion-portrait companion-complete-portrait" src={portraitImage(asset,resolution)} alt="" aria-hidden="true" draggable={false} decoding="async" />;
}
