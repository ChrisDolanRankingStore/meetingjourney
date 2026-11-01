export type DrawingPaperSize = { width: number; height: number };
export type DrawingZoom = {scale: number; x: number; y: number};
export const initialDrawingZoom: DrawingZoom = {scale:1, x:0, y:0};

export function zoomDrawing(view: DrawingZoom, from: {x:number; y:number}, to: {x:number; y:number}, factor: number, width: number, height: number): DrawingZoom {
  const scale = Math.max(1, Math.min(4, view.scale * factor));
  const ratio = scale / view.scale;
  return {scale, x:Math.max(width * (1 - scale), Math.min(0, to.x - (from.x - view.x) * ratio)),
    y:Math.max(height * (1 - scale), Math.min(0, to.y - (from.y - view.y) * ratio))};
}

// Existing strokes use 760 logical units across.  Extend the sheet downwards
// when adding a large canvas; never stretch or rewrite those stroke points.
export function createDrawingPaper(width: number, height: number): DrawingPaperSize {
  return { width: 760, height: Math.max(420, Math.round(760 * Math.max(1, height) / Math.max(1, width))) };
}

export function fitDrawingPaper(paper: DrawingPaperSize, width: number, height: number) {
  const scale = Math.min(Math.max(1, width) / paper.width, Math.max(1, height) / paper.height);
  return { scale, width: paper.width * scale, height: paper.height * scale };
}

// Fill the available drawing surface, using one scale for both axes. The saved
// paper is only enlarged when a new stroke reaches beyond its existing edges.
export function drawingSurface(paper: DrawingPaperSize, width: number, height: number) {
  const fit = fitDrawingPaper(paper, width, height);
  return { scale: fit.scale, width: Math.max(1, width), height: Math.max(1, height),
    paperWidth: Math.max(1, width) / fit.scale, paperHeight: Math.max(1, height) / fit.scale };
}

export function includeDrawingPoint(paper: DrawingPaperSize, point: {x: number; y: number}): DrawingPaperSize {
  const width = Math.max(paper.width, Math.ceil(point.x));
  const height = Math.max(paper.height, Math.ceil(point.y));
  return width === paper.width && height === paper.height ? paper : {width, height};
}
