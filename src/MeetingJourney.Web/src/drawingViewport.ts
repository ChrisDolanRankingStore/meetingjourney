export type DrawingPaperSize = { width: number; height: number };

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
