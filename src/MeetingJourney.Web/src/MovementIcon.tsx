import {paintedIconSource,type MovementAction} from './paintedIcons';

export function MovementIcon({action}: {action: MovementAction}) {
  return <img className={`movement-icon movement-icon-${action}`} src={paintedIconSource(`move-${action}`)} width="32" height="32" alt="" aria-hidden="true" draggable={false} />;
}
