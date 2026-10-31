import {paintedIconSource,type IllustratedIconName} from './paintedIcons';
export type {IllustratedIconName} from './paintedIcons';

export function IllustratedIcon({name}: {name: IllustratedIconName}) {
  return <img className="illustrated-icon" src={paintedIconSource(name)} width="48" height="48" alt="" aria-hidden="true" draggable={false} />;
}
