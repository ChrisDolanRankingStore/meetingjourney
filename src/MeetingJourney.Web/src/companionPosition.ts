export type CompanionPosition = {x: number; y: number};
export function companionVerticalTravel(stageHeight: number, portraitHeight: number, topClearance = 64) {
  return Math.max(0, stageHeight - portraitHeight - topClearance - 8);
}
export function moveCompanionPosition(origin: CompanionPosition, dx: number, dy: number,
  stage: {width: number; height: number; topClearance?: number}, portrait: {width: number; height: number}): CompanionPosition {
  const margin = Math.min(50, (portrait.width / 2 + 8) / Math.max(1, stage.width) * 100);
  const travel = companionVerticalTravel(stage.height, portrait.height, stage.topClearance);
  return {x: Math.max(margin, Math.min(100 - margin, origin.x + dx / Math.max(1, stage.width) * 100)),
    y: travel ? Math.max(0, Math.min(1, origin.y - dy / travel)) : 0};
}
