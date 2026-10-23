import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, Layer, Line, Stage } from 'react-konva';
import type { Stroke } from './types';
import { readDrawing, saveDrawing } from './storage';

interface Props { meetingId: string; partId: string; onSaved?: () => void; }
type Tool = Stroke['mode'];

export function DrawingPad({ meetingId, partId, onSaved }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#163b5c');
  const [size, setSize] = useState(5);
  const [width, setWidth] = useState(760);
  const [saving, setSaving] = useState(false);
  const drawing = useRef(false);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    readDrawing(meetingId, partId).then(saved => { if (!active) return; setStrokes(saved); setLoaded(true); }).catch(() => setLoaded(true));
    return () => { active = false; };
  }, [meetingId, partId]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      setSaving(true);
      saveDrawing(meetingId, partId, strokes).then(() => onSaved?.()).catch(() => undefined).finally(() => setSaving(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loaded, meetingId, onSaved, partId, strokes]);

  useEffect(() => {
    const resize = () => setWidth(Math.max(280, Math.min(760, stageRef.current?.container()?.parentElement?.clientWidth ?? 760)));
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const activeStroke = useMemo(() => ({ color: tool === 'eraser' ? '#ffffff' : color, size, mode: tool }), [color, size, tool]);

  const pointerPosition = () => stageRef.current?.getPointerPosition() as { x: number; y: number } | null;
  const start = () => {
    const point = pointerPosition();
    if (!point) return;
    drawing.current = true;
    setRedoStack([]);
    setStrokes(current => [...current, { ...activeStroke, points: [point.x, point.y] }]);
  };
  const move = () => {
    if (!drawing.current) return;
    const point = pointerPosition();
    if (!point) return;
    setStrokes(current => current.map((stroke, index) => index === current.length - 1 ? { ...stroke, points: [...stroke.points, point.x, point.y] } : stroke));
  };
  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
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
    if (!strokes.length || window.confirm('Clear this drawing page?')) { setRedoStack([]); setStrokes([]); }
  };
  const exportPng = () => {
    const data = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (!data) return;
    const link = document.createElement('a'); link.download = `${partId}-discovery.png`; link.href = data; link.click();
  };

  return <section className="drawing-card" aria-labelledby={`${partId}-drawing-title`}>
    <div className="drawing-heading"><div><h3 id={`${partId}-drawing-title`}>Doodle notes</h3><p>Draw, write or sketch a thought. It saves on this device.</p></div><span className="save-state" aria-live="polite">{saving ? 'Saving…' : 'Saved locally'}</span></div>
    <div className="drawing-toolbar" aria-label="Drawing tools">
      <label>Tool <select value={tool} onChange={event => setTool(event.target.value as Tool)}><option value="pen">Pen</option><option value="highlighter">Highlighter</option><option value="eraser">Eraser</option></select></label>
      <label>Colour <input aria-label="Pen colour" type="color" value={color} onChange={event => setColor(event.target.value)} /></label>
      <label>Size <input aria-label="Pen size" type="range" min="2" max="28" value={size} onChange={event => setSize(Number(event.target.value))} /></label>
      <button type="button" onClick={undo} disabled={!strokes.length}>Undo</button><button type="button" onClick={redo} disabled={!redoStack.length}>Redo</button><button type="button" onClick={clear}>Clear</button><button type="button" onClick={exportPng} disabled={!strokes.length}>Export PNG</button>
    </div>
    <div className="canvas-shell" onContextMenu={event => event.preventDefault()}>
      <Stage ref={stageRef} width={width} height={420} onMouseDown={start} onMousemove={move} onMouseup={finish} onTouchstart={start} onTouchmove={move} onTouchend={finish}>
        <Layer>
          <Line points={[]} stroke="#ffffff" />
          {strokes.map((stroke, index) => <Line key={index} points={stroke.points} stroke={stroke.color} strokeWidth={stroke.mode === 'highlighter' ? stroke.size * 3 : stroke.size} opacity={stroke.mode === 'highlighter' ? 0.35 : 1} lineCap="round" lineJoin="round" globalCompositeOperation={stroke.mode === 'eraser' ? 'destination-out' : 'source-over'} />)}
          {strokes.length === 0 && <Circle x={0} y={0} radius={0} />}
        </Layer>
      </Stage>
    </div>
  </section>;
}
