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

export function renderDrawingInk(strokes: Stroke[], width: number, height: number, limit = 2048, pixelRatio = 1, artwork?: {image:CanvasImageSource;width:number;height:number;hidden?:boolean}) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(pixelRatio, limit / Math.max(width, height));
  canvas.width = Math.max(1, Math.ceil(width * scale));
  canvas.height = Math.max(1, Math.ceil(height * scale));
  const context = canvas.getContext('2d', {willReadFrequently:true});
  if (!context) throw new Error('Drawing canvas is unavailable.');
  context.lineCap = 'round'; context.lineJoin = 'round';
  let fillSource:{canvas:HTMLCanvasElement;pixels:ImageData}|undefined;
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    if(stroke.mode==='fill'){
      const bounds=stroke.fillBounds??{width,height};
      const fillWidth=Math.min(canvas.width,Math.ceil(bounds.width*scale));
      const fillHeight=Math.min(canvas.height,Math.ceil(bounds.height*scale));
      const ink=context.getImageData(0,0,fillWidth,fillHeight);
      let pixels=ink;
      let edges:OutlineFillEdges|undefined;
      // Keep the outline only as a boundary mask so removing it cannot remove colouring.
      if(artwork&&(!artwork.hidden||stroke.fillUsesOutline)){
        if(!fillSource||fillSource.canvas.width!==fillWidth||fillSource.canvas.height!==fillHeight){
          const source=document.createElement('canvas');source.width=fillWidth;source.height=fillHeight;
          const sourceContext=source.getContext('2d',{willReadFrequently:true});
          if(!sourceContext)throw new Error('Drawing canvas is unavailable.');
          sourceContext.fillStyle='#fff';sourceContext.fillRect(0,0,fillWidth,fillHeight);
          sourceContext.drawImage(artwork.image,0,0,artwork.width*scale,artwork.height*scale);
          fillSource={canvas:source,pixels:sourceContext.getImageData(0,0,fillWidth,fillHeight)};
        }
        const mask=document.createElement('canvas');mask.width=fillWidth;mask.height=fillHeight;
        const maskContext=mask.getContext('2d',{willReadFrequently:true});
        if(!maskContext)throw new Error('Drawing canvas is unavailable.');
        maskContext.drawImage(fillSource.canvas,0,0);
        maskContext.drawImage(canvas,0,0);
        pixels=maskContext.getImageData(0,0,fillWidth,fillHeight);
        edges={pixels:fillSource.pixels.data,hidden:Boolean(artwork.hidden)};
      }
      const swatch=document.createElement('canvas');
      swatch.width=swatch.height=1;
      const colour=swatch.getContext('2d');
      if(!colour)throw new Error('Drawing canvas is unavailable.');
      colour.fillStyle=stroke.color;colour.fillRect(0,0,1,1);
      floodFillPixels(pixels.data,fillWidth,fillHeight,Math.floor(stroke.points[0]*scale),Math.floor(stroke.points[1]*scale),colour.getImageData(0,0,1,1).data,ink.data,edges);
      context.putImageData(ink,0,0);
      continue;
    }
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
  if(artwork&&!artwork.hidden){
    context.globalCompositeOperation='destination-over';context.globalAlpha=1;
    context.drawImage(artwork.image,0,0,artwork.width*scale,artwork.height*scale);
    context.globalCompositeOperation='source-over';
  }
  return canvas;
}

type OutlineFillEdges={pixels:Uint8ClampedArray;hidden:boolean};

function outlineCoverage(source:Uint8ClampedArray,offset:number){
  const r=source[offset],g=source[offset+1],b=source[offset+2];
  return Math.max(r,g,b)-Math.min(r,g,b)<=2?r/255:0;
}

function colourOutlineEdge(pixels:Uint8ClampedArray,ink:Uint8ClampedArray,offset:number,target:Uint8ClampedArray,colour:ArrayLike<number>,outline:OutlineFillEdges){
  const coverage=outlineCoverage(outline.pixels,offset);
  if(coverage<=0||coverage>=1)return false;
  if(outline.hidden){
    const alpha=ink[offset+3]/255;
    let untouched=alpha===0,recolouring=alpha>0&&Math.abs(alpha-coverage)<=1/255;
    for(let channel=0;channel<3;channel++){
      if(Math.abs(pixels[offset+channel]-target[channel]*coverage)>24)untouched=false;
      // Canvas readback quantises premultiplied RGB, especially at very low alpha.
      if(Math.abs((ink[offset+channel]-target[channel])*alpha)>24*alpha+1)recolouring=false;
    }
    if(!untouched&&!recolouring)return false;
    for(let channel=0;channel<3;channel++)ink[offset+channel]=colour[channel];
    ink[offset+3]=255*coverage;
  }else{
    for(let channel=0;channel<3;channel++)if(Math.abs(pixels[offset+channel]-target[channel]*coverage)>24)return false;
    // Replace only the paper-colour contribution, retaining the line's antialiasing.
    for(let channel=0;channel<3;channel++)ink[offset+channel]=outline.pixels[offset+channel]+(colour[channel]-255)*coverage;
    ink[offset+3]=255;
  }
  return true;
}

export function floodFillPixels(pixels:Uint8ClampedArray,width:number,height:number,x:number,y:number,colour:ArrayLike<number>,ink?:Uint8ClampedArray,outline?:OutlineFillEdges){
  if(x<0||y<0||x>=width||y>=height)return;
  const start=(y*width+x)*4;
  const target=pixels.slice(start,start+4);
  if(target.every((value,index)=>value===colour[index]))return;
  const smooth=outline&&ink&&target[3]===255&&colour[3]===255&&outlineCoverage(outline.pixels,start)>=231/255?outline:undefined;
  const seen=new Uint8Array(width*height);
  const queue=new Int32Array(width*height);
  const edges:number[]=[];
  let head=0,tail=0;
  queue[tail++]=y*width+x;seen[y*width+x]=1;
  const matches=(index:number)=>{
    const offset=index*4;
    if(Math.abs(pixels[offset+3]-target[3])>24)return false;
    if(target[3]===0)return true;
    for(let channel=0;channel<3;channel++)if(Math.abs(pixels[offset+channel]-target[channel])>24)return false;
    return true;
  };
  const enqueue=(next:number,from:number)=>{
    if(seen[next])return;
    seen[next]=1;
    const coverage=smooth?outlineCoverage(smooth.pixels,next*4):1;
    // A dark previous fill must not make a matching black outline floodable paper.
    if(matches(next)&&coverage>=231/255)queue[tail++]=next;
    else if(smooth&&coverage<outlineCoverage(smooth.pixels,from*4))edges.push(next);
  };
  while(head<tail){
    const index=queue[head++],offset=index*4;
    if(ink&&!(smooth&&colourOutlineEdge(pixels,ink,offset,target,colour,smooth)))ink.set(colour,offset);
    pixels.set(colour,offset);
    if(index%width>0)enqueue(index-1,index);
    if(index%width<width-1)enqueue(index+1,index);
    if(index>=width)enqueue(index-width,index);
    if(index<width*(height-1))enqueue(index+width,index);
  }
  for(let head=0;head<edges.length;head++){
    const index=edges[head],offset=index*4;
    if(!smooth||!ink||!colourOutlineEdge(pixels,ink,offset,target,colour,smooth))continue;
    const coverage=outlineCoverage(smooth.pixels,offset);
    const extend=(next:number)=>{
      if(seen[next]||outlineCoverage(smooth.pixels,next*4)>=coverage)return;
      seen[next]=1;edges.push(next);
    };
    // Walk only down the light-to-dark fringe, never up the far side of a line.
    if(index%width>0)extend(index-1);
    if(index%width<width-1)extend(index+1);
    if(index>=width)extend(index-width);
    if(index<width*(height-1))extend(index+width);
  }
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
