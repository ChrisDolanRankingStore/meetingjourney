export const illustratedIconNames = ['listen','discover','notes','references','clue','thought','question','heart','connect'] as const;
export const movementIconNames = ['fidget','bounce','stretch','sway','shake','dance'] as const;
export type IllustratedIconName = typeof illustratedIconNames[number];
export type MovementAction = typeof movementIconNames[number];
export const paintedIconSource = (name: IllustratedIconName | `move-${MovementAction}`) => `/assets/painted-icons-v1/${name}.webp`;
export const paintedIconAssets = [
  ...illustratedIconNames.map(paintedIconSource),
  ...movementIconNames.map(name=>paintedIconSource(`move-${name}`))
];
