import {portraitImage} from './artwork';
/** The complete illustration includes any glasses or carried item. Nothing is positioned over a face. */
export function CompanionPortrait({asset,resolution=360,description}:{asset:string;resolution?:number;description?:string}) {
  return <img className="companion-portrait companion-complete-portrait" src={portraitImage(asset,resolution)} alt={description??''} aria-hidden={description?undefined:true} draggable={false} decoding="async" />;
}
