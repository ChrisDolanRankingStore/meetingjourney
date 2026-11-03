import {t} from './i18n';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Circle, Image, Layer, Line, Rect, Stage } from 'react-konva';
import type { Stroke } from './types';
import { readDrawingPage, saveDrawing } from './storage';
import { createDrawingPaper, drawingSurface, includeDrawingPoint, initialDrawingZoom, zoomDrawing, type DrawingPaperSize } from './drawingViewport';
import { DrawingToolbar, type DrawingPageControls } from './DrawingToolbar';
import {renderDrawingInk} from './drawingInk';

interface Props { meetingId: string; partId: string; onSaved?: () => void; }
type Tool = Stroke['mode'];

export function DrawingPad({ meetingId, partId, onSaved }: Props) {
  const pageKey = `mj-drawing-pages:${meetingId}:${partId}`;
  const [pageCount, setPageCount] = useState(() => Math.max(1, Math.min(50, Number(localStorage.getItem(pageKey)) || 1)));
  const [page, setPage] = useState(0);
  const [template, setTemplate] = useState<'blank' | 'lined'>('blank');
  return <div className="drawing-notebook"><DrawingPage key={`${meetingId}:${partId}:${page}`} meetingId={meetingId} partId={page === 0 ? partId : `${partId}::page::${page}`} onSaved={onSaved} template={template} pages={{ page, count: pageCount, onSelect: setPage, onAdd: () => { localStorage.setItem(pageKey, String(pageCount + 1)); setPage(pageCount); setPageCount(count => count + 1); }, template, onTemplate: setTemplate }} /></div>;
}

function DrawingPage({ meetingId, partId, onSaved, template, pages }: Props & { template: 'blank' | 'lined'; pages: DrawingPageControls }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#163b5c');
  const [size, setSize] = useState(5);
  const [smudgeSize, setSmudgeSize] = useState(18);
  const [width, setWidth] = useState(760);
  const [height, setHeight] = useState(420);
  const [paper, setPaper] = useState<DrawingPaperSize | null>(null);
  const [measured, setMeasured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const drawing = useRef(false);
  const [zoom, setZoom] = useState(initialDrawingZoom);
  const zoomRef = useRef(zoom);
  const pointers = useRef(new Map<number, {x:number; y:number}>());
  const gesture = useRef(false);
  const strokeStart = useRef<{strokes:Stroke[]; redo:Stroke[]; paper:DrawingPaperSize | null} | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const latestDrawing = useRef({ strokes, loaded, paper });
  latestDrawing.current = { strokes, loaded, paper };
  useEffect(() => {
    const flush = () => { if (latestDrawing.current.loaded && latestDrawing.current.paper) void saveDrawing(meetingId, partId, latestDrawing.current.strokes, latestDrawing.current.paper).catch(() => undefined); };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [meetingId, partId]);

  useEffect(() => {
    let active = true;
    readDrawingPage(meetingId, partId).then(saved => { if (!active) return; setStrokes(saved.strokes); setPaper(saved.paper ?? null); setLoaded(true); }).catch(() => { if (active) setSaveError(true); });
    return () => { active = false; };
  }, [meetingId, partId]);

  useEffect(() => {
    if (!loaded || !paper) return;
    const timer = window.setTimeout(() => {
      setSaving(true);
      saveDrawing(meetingId, partId, strokes, paper).then(() => { setSaveError(false); onSaved?.(); }).catch(() => setSaveError(true)).finally(() => setSaving(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loaded, meetingId, onSaved, partId, strokes, paper]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.clientWidth < 1 || canvas.clientHeight < 1) return;
      setWidth(canvas.clientWidth); setHeight(canvas.clientHeight); setMeasured(true);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!loaded || !measured) return;
    const available = createDrawingPaper(width, height);
    if (!paper) setPaper(available);
  }, [loaded, measured, paper, width, height]);
  const sheet = paper ?? { width: 760, height: 420 };
  const view = drawingSurface(sheet, width, height);
  const ink = useMemo(() => strokes.some(stroke => stroke.mode === 'smudge') ? renderDrawingInk(strokes, sheet.width, sheet.height, 2048, 2) : null, [strokes, sheet.width, sheet.height]);
  const changeZoom = (next: typeof zoom) => { zoomRef.current = next; setZoom(next); };
  useEffect(() => { zoomRef.current = initialDrawingZoom; setZoom(initialDrawingZoom); }, [width, height]);

  const brushSize = tool === 'smudge' ? smudgeSize : size;
  const activeStroke = useMemo(() => ({ color: tool === 'eraser' ? '#ffffff' : color, size:brushSize, mode: tool }), [color, brushSize, tool]);

  const canvasPosition = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {x:event.clientX - bounds.left - event.currentTarget.clientLeft, y:event.clientY - bounds.top - event.currentTarget.clientTop};
  };
  const pointerPosition = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = canvasPosition(event), currentZoom = zoomRef.current;
    return {x:Math.max(0, (point.x - currentZoom.x) / (view.scale * currentZoom.scale)), y:Math.max(0, (point.y - currentZoom.y) / (view.scale * currentZoom.scale))};
  };
  const start = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !loaded || !paper) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, canvasPosition(event));
    if (pointers.current.size > 1) {
      gesture.current = true;
      if (drawing.current && strokeStart.current) {
        setStrokes(strokeStart.current.strokes); setRedoStack(strokeStart.current.redo); setPaper(strokeStart.current.paper);
        drawing.current = false;
      }
      return;
    }
    gesture.current = false;
    strokeStart.current = {strokes:latestDrawing.current.strokes, redo:redoStack, paper};
    const point = pointerPosition(event);
    if (!point || !loaded || !paper) return;
    setPaper(current => current ? includeDrawingPoint(current, point) : current);
    drawing.current = true;
    setRedoStack([]);
    setStrokes(current => [...current, { ...activeStroke, points: [point.x, point.y] }]);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    const previous = [...pointers.current.values()];
    pointers.current.set(event.pointerId, canvasPosition(event));
    const current = [...pointers.current.values()];
    if (gesture.current) {
      if (current.length === 2) {
        const middle = (points: typeof current) => ({x:(points[0].x + points[1].x) / 2, y:(points[0].y + points[1].y) / 2});
        const distance = (points: typeof current) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        changeZoom(zoomDrawing(zoomRef.current, middle(previous), middle(current), distance(current) / Math.max(1, distance(previous)), width, height));
      }
      return;
    }
    if (!drawing.current) return;
    const point = pointerPosition(event);
    if (!point) return;
    setPaper(current => current ? includeDrawingPoint(current, point) : current);
    setStrokes(current => current.map((stroke, index) => index === current.length - 1 ? { ...stroke, points: [...stroke.points, point.x, point.y] } : stroke));
  };
  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (gesture.current) { if (!pointers.current.size) gesture.current = false; return; }
    if (!drawing.current) return;
    drawing.current = false;
    if (event.type === 'pointercancel' && strokeStart.current) {
      setStrokes(strokeStart.current.strokes); setRedoStack(strokeStart.current.redo); setPaper(strokeStart.current.paper);
      return;
    }
    if (latestDrawing.current.paper) void saveDrawing(meetingId, partId, latestDrawing.current.strokes, latestDrawing.current.paper).catch(() => setSaveError(true));
  };
  const undo = () => setStrokes(current => {
    if (!current.length) return current;
    const next = current.slice(0, -1);
    setRedoStack(redo => [current[current.length - 1], ...redo]);
    return next;
  });
  const redo = () => setRedoStack(current => {
    const [first, ...rest] = current;
    if (!first) return current;
    setStrokes(strokesNow => [...strokesNow, first]);
    return rest;
  });
  const clear = () => {
    if (!strokes.length || window.confirm(t("Clear this drawing page?"))) { setRedoStack([]); setStrokes([]); }
  };
  const exportPng = () => {
    const exportInk = renderDrawingInk(strokes, sheet.width, sheet.height, 4096, 2);
    const output = document.createElement('canvas'); output.width = exportInk.width; output.height = exportInk.height;
    const context = output.getContext('2d');
    if (!context) { window.alert(t('Could not export this drawing.')); return; }
    context.fillStyle = '#fffdf7'; context.fillRect(0, 0, output.width, output.height);
    if (template === 'lined') {
      const scale = output.width / sheet.width;
      context.strokeStyle = '#d7dfef'; context.lineWidth = scale;
      for (let y = 30; y < sheet.height; y += 30) { context.beginPath(); context.moveTo(0, y * scale); context.lineTo(output.width, y * scale); context.stroke(); }
    }
    context.drawImage(exportInk, 0, 0);
    const data = output.toDataURL('image/png');
    const link = document.createElement('a'); link.download = `${partId}-discovery.png`; link.href = data; link.click();
  };

  return <section className="drawing-card" aria-labelledby={`${partId}-drawing-title`}>
    <div className="drawing-heading"><div><h3 id={`${partId}-drawing-title`}>{t("Doodle notes")}</h3><p>{t("Draw, write or sketch a thought.")}</p></div></div><span className={`save-state notebook-save-state ${saveError ? 'has-error' : ''}`} aria-live="polite">{saveError ? t("Could not load or save this drawing on this device.") : !loaded ? t("Opening your drawing…") : saving ? t("Saving…") : t("Saved on this device")}</span>
    <div className="drawing-paper-workspace">
    <DrawingToolbar tool={tool} onTool={setTool} colour={color} onColour={setColor} size={brushSize} onSize={tool === 'smudge' ? setSmudgeSize : setSize} canUndo={strokes.length > 0} canRedo={redoStack.length > 0} onUndo={undo} onRedo={redo} onClear={clear} onExport={exportPng} zoom={zoom.scale} onZoom={value=>changeZoom(zoomDrawing(zoomRef.current,{x:width/2,y:height/2},{x:width/2,y:height/2},value/zoomRef.current.scale,width,height))} onResetZoom={()=>changeZoom(initialDrawingZoom)} onExtendPaper={() => setPaper(current => current ? includeDrawingPoint(current, {x:view.paperWidth, y:view.paperHeight}) : createDrawingPaper(width, height))} pages={pages} />
    <div className="canvas-shell" ref={canvasRef} onContextMenu={event => event.preventDefault()} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} data-zoom={zoom.scale}>
      <Stage width={view.width} height={view.height}>
        <Layer x={zoom.x} y={zoom.y} scaleX={view.scale * zoom.scale} scaleY={view.scale * zoom.scale}><Rect width={view.paperWidth} height={view.paperHeight} fill="#fffdf7" />{template === 'lined' && Array.from({ length: Math.ceil(view.paperHeight / 30) }, (_, index) => <Line key={index} points={[0, 30 + index * 30, view.paperWidth, 30 + index * 30]} stroke="#d7dfef" strokeWidth={1} />)}</Layer>
        <Layer x={zoom.x} y={zoom.y} scaleX={view.scale * zoom.scale} scaleY={view.scale * zoom.scale}>
          <Line points={[]} stroke="#ffffff" />
          {ink ? <Image image={ink} width={sheet.width} height={sheet.height} /> : strokes.map((stroke, index) => <Line key={index} points={stroke.points} stroke={stroke.color} strokeWidth={stroke.mode === 'highlighter' ? stroke.size * 3 : stroke.size} opacity={stroke.mode === 'highlighter' ? 0.35 : 1} lineCap="round" lineJoin="round" globalCompositeOperation={stroke.mode === 'eraser' ? 'destination-out' : 'source-over'} />)}
          {strokes.length === 0 && <Circle x={0} y={0} radius={0} />}
        </Layer>
      </Stage>
    </div>
    </div>
  </section>;
}
