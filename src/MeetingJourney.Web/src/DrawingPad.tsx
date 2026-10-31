import {t} from './i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Layer, Line, Rect, Stage } from 'react-konva';
import type { Stroke } from './types';
import { readDrawingPage, saveDrawing } from './storage';
import { createDrawingPaper, drawingSurface, includeDrawingPoint, type DrawingPaperSize } from './drawingViewport';
import { DrawingToolbar, type DrawingPageControls } from './DrawingToolbar';

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
  const [width, setWidth] = useState(760);
  const [height, setHeight] = useState(420);
  const [paper, setPaper] = useState<DrawingPaperSize | null>(null);
  const [measured, setMeasured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const drawing = useRef(false);
  const stageRef = useRef<any>(null);
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

  const activeStroke = useMemo(() => ({ color: tool === 'eraser' ? '#ffffff' : color, size, mode: tool }), [color, size, tool]);

  const pointerPosition = () => {
    const point = stageRef.current?.getPointerPosition() as { x: number; y: number } | null;
    return point ? { x: point.x / view.scale, y: point.y / view.scale } : null;
  };
  const start = () => {
    const point = pointerPosition();
    if (!point || !loaded || !paper) return;
    setPaper(current => current ? includeDrawingPoint(current, point) : current);
    drawing.current = true;
    setRedoStack([]);
    setStrokes(current => [...current, { ...activeStroke, points: [point.x, point.y] }]);
  };
  const move = () => {
    if (!drawing.current) return;
    const point = pointerPosition();
    if (!point) return;
    setPaper(current => current ? includeDrawingPoint(current, point) : current);
    setStrokes(current => current.map((stroke, index) => index === current.length - 1 ? { ...stroke, points: [...stroke.points, point.x, point.y] } : stroke));
  };
  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
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
    const data = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!data) return;
    const link = document.createElement('a'); link.download = `${partId}-discovery.png`; link.href = data; link.click();
  };

  return <section className="drawing-card" aria-labelledby={`${partId}-drawing-title`}>
    <div className="drawing-heading"><div><h3 id={`${partId}-drawing-title`}>{t("Doodle notes")}</h3><p>{t("Draw, write or sketch a thought.")}</p></div></div><span className={`save-state notebook-save-state ${saveError ? 'has-error' : ''}`} aria-live="polite">{saveError ? t("Could not load or save this drawing on this device.") : !loaded ? t("Opening your drawing…") : saving ? t("Saving…") : t("Saved on this device")}</span>
    <div className="drawing-paper-workspace">
    <DrawingToolbar tool={tool} onTool={setTool} colour={color} onColour={setColor} size={size} onSize={setSize} canUndo={strokes.length > 0} canRedo={redoStack.length > 0} onUndo={undo} onRedo={redo} onClear={clear} onExport={exportPng} onExtendPaper={() => setPaper(current => current ? includeDrawingPoint(current, {x:view.paperWidth, y:view.paperHeight}) : createDrawingPaper(width, height))} pages={pages} />
    <div className="canvas-shell" ref={canvasRef} onContextMenu={event => event.preventDefault()}>
      <Stage ref={stageRef} width={view.width} height={view.height} onMouseDown={start} onMousemove={move} onMouseup={finish} onMouseleave={finish} onTouchstart={start} onTouchmove={move} onTouchend={finish} onTouchcancel={finish}>
        <Layer scaleX={view.scale} scaleY={view.scale}><Rect width={view.paperWidth} height={view.paperHeight} fill="#fffdf7" />{template === 'lined' && Array.from({ length: Math.ceil(view.paperHeight / 30) }, (_, index) => <Line key={index} points={[0, 30 + index * 30, view.paperWidth, 30 + index * 30]} stroke="#d7dfef" strokeWidth={1} />)}</Layer>
        <Layer scaleX={view.scale} scaleY={view.scale}>
          <Line points={[]} stroke="#ffffff" />
          {strokes.map((stroke, index) => <Line key={index} points={stroke.points} stroke={stroke.color} strokeWidth={stroke.mode === 'highlighter' ? stroke.size * 3 : stroke.size} opacity={stroke.mode === 'highlighter' ? 0.35 : 1} lineCap="round" lineJoin="round" globalCompositeOperation={stroke.mode === 'eraser' ? 'destination-out' : 'source-over'} />)}
          {strokes.length === 0 && <Circle x={0} y={0} radius={0} />}
        </Layer>
      </Stage>
    </div>
    </div>
  </section>;
}
