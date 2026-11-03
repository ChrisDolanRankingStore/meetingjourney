import type {Stroke} from './types';

export function pointerSamples<T extends {clientX:number;clientY:number;getCoalescedEvents?:()=>T[]}>(event:T):T[]{
  const samples=event.getCoalescedEvents?.()??[];
  const last=samples[samples.length-1];
  return last&&last.clientX===event.clientX&&last.clientY===event.clientY?samples:[...samples,event];
}

export function smoothStrokePoints(points:number[]):number[]{
  if(points.length<6)return points;
  const result=points.slice(0,2);
  let x=points[0],y=points[1];
  for(let index=2;index+3<points.length;index+=2){
    const controlX=points[index],controlY=points[index+1];
    const endX=(controlX+points[index+2])/2,endY=(controlY+points[index+3])/2;
    for(let step=1;step<=4;step++){
      const t=step/4,u=1-t;
      result.push(u*u*x+2*u*t*controlX+t*t*endX,u*u*y+2*u*t*controlY+t*t*endY);
    }
    x=endX;y=endY;
  }
  result.push(...points.slice(-2));
  return result;
}

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
    const points=stroke.smooth?smoothStrokePoints(stroke.points):stroke.points;
    if (stroke.mode === 'smudge') {
      smudgeInk(context, points.map(point => point * scale), stroke.size * 3 * scale);
      continue;
    }
    context.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';
    context.globalAlpha = stroke.mode === 'highlighter' ? .35 : 1;
    context.strokeStyle = stroke.color; context.fillStyle = stroke.color;
    context.lineWidth = stroke.size * scale * (stroke.mode === 'highlighter' ? 3 : 1);
    context.beginPath();
    if (points.length === 2) {
      context.arc(points[0] * scale, points[1] * scale, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.moveTo(points[0] * scale, points[1] * scale);
      for (let index = 2; index + 1 < points.length; index += 2) context.lineTo(points[index] * scale, points[index + 1] * scale);
      context.stroke();
    }
  }
  return canvas;
}

function smudgeInk(context: CanvasRenderingContext2D, points: number[], diameter: number) {
  const radius = Math.max(1, Math.ceil(diameter / 2));
  const width = radius * 2;
  const brush = context.getImageData(Math.round(points[0]) - radius, Math.round(points[1]) - radius, width, width).data;
  for (let index = 2; index + 1 < points.length; index += 2) {
    const dx = points[index] - points[index - 2], dy = points[index + 1] - points[index - 1];
    const steps = Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 3));
    for (let step = 1; step <= steps; step++) {
      const x = Math.round(points[index - 2] + dx * step / steps) - radius, y = Math.round(points[index - 1] + dy * step / steps) - radius;
      const patch = context.getImageData(x, y, width, width);
      blendSmudgePixels(patch.data, brush, width);
      context.putImageData(patch, x, y);
    }
  }
}

export function blendSmudgePixels(pixels: Uint8ClampedArray, brush: Uint8ClampedArray, width: number) {
  const radius = width / 2;
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const weight = .7 * Math.max(0, 1 - Math.hypot(x + .5 - radius, y + .5 - radius) / radius);
    if (!weight) continue;
    const index = (y * width + x) * 4;
    const destinationAlpha = pixels[index + 3] / 255, carriedAlpha = brush[index + 3] / 255;
    const alpha = destinationAlpha * (1 - weight) + carriedAlpha * weight;
    const pickupAlpha = carriedAlpha * .75 + destinationAlpha * .25;
    for (let channel = 0; channel < 3; channel++) {
      const destination = pixels[index + channel] * destinationAlpha, carried = brush[index + channel] * carriedAlpha;
      pixels[index + channel] = alpha ? (destination * (1 - weight) + carried * weight) / alpha : 0;
      brush[index + channel] = pickupAlpha ? (carried * .75 + destination * .25) / pickupAlpha : 0;
    }
    pixels[index + 3] = alpha * 255;
    brush[index + 3] = pickupAlpha * 255;
  }
}
