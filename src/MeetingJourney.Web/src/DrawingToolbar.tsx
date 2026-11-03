import {t, tt} from './i18n';
import { useEffect, useId, useRef, useState } from 'react';
import type { Stroke } from './types';
import { NotebookIcon } from './NotebookIcon';

export interface DrawingPageControls {
  page: number;
  count: number;
  onSelect: (page: number) => void;
  onAdd: () => void;
  template: 'blank' | 'lined';
  onTemplate: (template: 'blank' | 'lined') => void;
}

interface Props {
  tool: Stroke['mode']; onTool: (tool: Stroke['mode']) => void;
  colour: string; onColour: (colour: string) => void;
  size: number; onSize: (size: number) => void;
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void; onClear: () => void; onExport: () => void;
  onExtendPaper: () => void;
  zoom: number; onZoom: (zoom: number) => void; onResetZoom: () => void;
  pages: DrawingPageControls;
}

type DrawingPanel = Stroke['mode'] | 'colour' | 'edit' | 'pages' | 'paper';
const drawingColours = [['#163b5c','Ink blue'],['#c54d43','Red'],['#d6a63e','Gold'],['#785ca3','Purple'],['#49896a','Green']] as const;

export function DrawingToolbar(props: Props) {
  const [panel, setPanel] = useState<DrawingPanel | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const id = `drawing-options-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    if (!panel) return;
    const outside = (event: PointerEvent) => { if (!hostRef.current?.contains(event.target as Node)) setPanel(null); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setPanel(null);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape, true);
    };
  }, [panel]);
  const toggle = (name: DrawingPanel, trigger: HTMLButtonElement) => {
    if (name === 'pen' || name === 'highlighter' || name === 'eraser' || name === 'smudge') props.onTool(name);
    triggerRef.current = trigger;
    setPanel(current => current === name ? null : name);
  };
  const panelTitle = panel ? t(({pen:'Pen options',highlighter:'Highlighter options',eraser:'Eraser options',smudge:'Smudge options',colour:'Pen colour',edit:'Edit drawing',pages:'Your drawing pages',paper:'Paper and drawing'})[panel]) : '';
  const sizeLabel = t(panel === 'smudge' ? 'Smudge size' : panel === 'eraser' ? 'Eraser size' : panel === 'highlighter' ? 'Highlighter size' : 'Pen size');
  return <div className="drawing-toolbar-host" ref={hostRef}>
    <div className="drawing-toolbar drawing-icon-toolbar" role="toolbar" aria-orientation="vertical" aria-label={t("Drawing tools")}>
      {(['pen','highlighter','eraser','smudge'] as const).map(tool=><button key={tool} className={`drawing-icon-button${props.tool===tool?' is-selected':''}`} type="button" title={t(tool[0].toUpperCase()+tool.slice(1))} aria-label={t(tool[0].toUpperCase()+tool.slice(1))} aria-pressed={props.tool===tool} aria-expanded={panel===tool} aria-controls={id} onClick={event=>toggle(tool,event.currentTarget)}><NotebookIcon name={tool} /></button>)}
      {drawingColours.slice(0,3).map(([value,label])=><button className="drawing-icon-button drawing-rail-colour" type="button" key={value} aria-label={t(label)} title={t(label)} aria-pressed={props.colour===value} onClick={()=>{props.onColour(value);setPanel(null);}}><span className="drawing-colour-swatch" style={{backgroundColor:value}} aria-hidden="true" /></button>)}
      <button className="drawing-icon-button drawing-all-colours" type="button" title={t("More colours")} aria-label={t("More colours")} aria-expanded={panel === 'colour'} aria-controls={id} onClick={event => toggle('colour', event.currentTarget)}><NotebookIcon name="plus" /></button>
      <button className="drawing-icon-button" type="button" title={t("Edit drawing")} aria-label={t("Edit drawing")} aria-expanded={panel === 'edit'} aria-controls={id} onClick={event => toggle('edit', event.currentTarget)}><NotebookIcon name="undo" /></button>
      <button className="drawing-icon-button" type="button" title={tt`Drawing page ${props.pages.page + 1}. Manage pages`} aria-label={tt`Drawing page ${props.pages.page + 1} of ${props.pages.count}. Manage pages`} aria-expanded={panel === 'pages'} aria-controls={id} onClick={event => toggle('pages', event.currentTarget)}><NotebookIcon name="pages" /><span className="drawing-page-badge" aria-hidden="true">{props.pages.page + 1}</span></button>
      <button className="drawing-icon-button" type="button" title={t("Paper and drawing")} aria-label={t("Paper and drawing")} aria-expanded={panel === 'paper'} aria-controls={id} onClick={event => toggle('paper', event.currentTarget)}><NotebookIcon name="note" /></button>
    </div>
    {panel && <div className="drawing-options-panel" id={id} role="group" aria-label={panelTitle}>
      <div className="drawing-options-heading"><strong>{panelTitle}</strong><button type="button" className="drawing-icon-button" title={t("Close options")} aria-label={t("Close drawing options")} onClick={() => { setPanel(null); triggerRef.current?.focus(); }}><NotebookIcon name="close" /></button></div>
      {panel === 'colour' && <><div className="drawing-colour-choices">{drawingColours.map(([value,label])=><button type="button" key={value} aria-label={t(label)} title={t(label)} aria-pressed={props.colour===value} onClick={()=>props.onColour(value)}><span className="drawing-colour-swatch" style={{backgroundColor:value}} aria-hidden="true" /></button>)}</div><label className="drawing-custom-colour">{t("Pen colour")}<input aria-label={t("Pen colour")} type="color" value={props.colour} onChange={event=>props.onColour(event.target.value)} /></label></>}
      {(panel === 'pen' || panel === 'highlighter' || panel === 'eraser' || panel === 'smudge') && <label className="drawing-size-control">{sizeLabel}<input aria-label={sizeLabel} type="range" min="2" max="28" value={props.size} onChange={event => props.onSize(Number(event.target.value))} /><output>{props.size}</output></label>}
      {panel === 'smudge' && <p>{t('Drag across existing ink to blend it. Smudge does not add a new colour.')}</p>}
      {panel === 'edit' && <div className="drawing-more-actions"><button type="button" disabled={!props.canUndo} onClick={props.onUndo}><NotebookIcon name="undo" />{t("Undo last stroke")}</button><button type="button" disabled={!props.canRedo} onClick={props.onRedo}><NotebookIcon name="redo" />{t("Redo last stroke")}</button><button type="button" disabled={!props.canUndo} onClick={() => { props.onClear(); setPanel(null); }}><NotebookIcon name="trash" />{t("Clear this page")}</button></div>}
      {panel === 'pages' && <div className="drawing-page-choices">{Array.from({ length: props.pages.count }, (_, index) => <button type="button" key={index} aria-pressed={props.pages.page === index} onClick={() => { props.pages.onSelect(index); setPanel(null); }}>{t("Page ")}{index + 1}</button>)}<button type="button" disabled={props.pages.count >= 50} onClick={() => { props.pages.onAdd(); setPanel(null); }}><NotebookIcon name="plus" />{t("Add page")}</button></div>}
      {panel === 'paper' && <><label className="drawing-size-control">{t('Zoom')}<input aria-label={t('Zoom')} type="range" min="1" max="4" step=".1" value={props.zoom} onChange={event=>props.onZoom(Number(event.target.value))} /><output>{Math.round(props.zoom * 100)}%</output></label><div className="drawing-more-actions"><button type="button" onClick={props.onResetZoom}><NotebookIcon name="expand" />{t('Reset zoom')}</button></div><p>{t('Pinch to zoom; move two fingers to pan.')}</p><div className="drawing-paper-choices" role="group" aria-label={t("Paper style")}><button type="button" aria-pressed={props.pages.template === 'blank'} onClick={() => props.pages.onTemplate('blank')}>{t("Blank paper")}</button><button type="button" aria-pressed={props.pages.template === 'lined'} onClick={() => props.pages.onTemplate('lined')}>{t("Lined paper")}</button></div><div className="drawing-more-actions"><button type="button" onClick={() => { props.onExtendPaper(); setPanel(null); }}><NotebookIcon name="expand" />{t("Use available canvas")}</button><button type="button" disabled={!props.canUndo} onClick={() => { props.onExport(); setPanel(null); }}><NotebookIcon name="download" />{t("Export PNG")}</button></div></>}
    </div>}
  </div>;
}
