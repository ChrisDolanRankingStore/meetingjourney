import type {Stroke} from './types';

export function renderDrawingInk(strokes: Stroke[], width: number, height: number, limit = 2048, pixelRatio = 1) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(pixelRatio, limit / Math.max(width, height));
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const context = canvas.getContext('2d', {willReadFrequently:true});
  if (!context) throw new Error('Drawing canvas is unavailable.');
  context.lineCap = 'round'; context.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    if (stroke.mode === 'smudge') {
      smudgeInk(context, stroke.points.map(point => point * scale), stroke.size * 3 * scale);
      continue;
    }
    context.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';
    context.globalAlpha = stroke.mode === 'highlighter' ? .35 : 1;
    context.strokeStyle = stroke.color; context.fillStyle = stroke.color;
    context.lineWidth = stroke.size * scale * (stroke.mode === 'highlighter' ? 3 : 1);
    context.beginPath();
    if (stroke.points.length === 2) {
      context.arc(stroke.points[0] * scale, stroke.points[1] * scale, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.moveTo(stroke.points[0] * scale, stroke.points[1] * scale);
      for (let index = 2; index + 1 < stroke.points.length; index += 2) context.lineTo(stroke.points[index] * scale, stroke.points[index + 1] * scale);
      context.stroke();
    }
  }
  return canvas;
}

function smudgeInk(context: CanvasRenderingContext2D, points: number[], diameter: number) {
  const radius = Math.max(1, Math.ceil(diameter / 2));
  const brush = document.createElement('canvas');
  brush.width = brush.height = radius * 2;
  const pickup = brush.getContext('2d');
  if (!pickup) throw new Error('Smudge canvas is unavailable.');
  const sample = (x: number, y: number, opacity: number) => {
    pickup.globalCompositeOperation = 'source-over'; pickup.globalAlpha = opacity;
    pickup.drawImage(context.canvas, x - radius, y - radius, radius * 2, radius * 2, 0, 0, radius * 2, radius * 2);
    pickup.globalCompositeOperation = 'destination-in'; pickup.globalAlpha = 1;
    pickup.beginPath(); pickup.arc(radius, radius, radius, 0, Math.PI * 2); pickup.fill();
  };
  context.globalCompositeOperation = 'source-over'; context.globalAlpha = .5;
  sample(points[0], points[1], 1);
  for (let index = 2; index + 1 < points.length; index += 2) {
    const dx = points[index] - points[index - 2], dy = points[index + 1] - points[index - 1];
    const steps = Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 4));
    for (let step = 1; step <= steps; step++) {
      const x = points[index - 2] + dx * step / steps, y = points[index - 1] + dy * step / steps;
      context.drawImage(brush, x - radius, y - radius);
      sample(x, y, .25);
    }
  }
}
