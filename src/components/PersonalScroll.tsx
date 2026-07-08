'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Brush, Eraser, Heading1, Heading2, Heading3, Highlighter, Italic, List, ListOrdered, Pilcrow, Quote, Redo2, Strikethrough, Type, Underline, Undo2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

type StrokePoint = { x: number; y: number };
type Stroke = { color: string; size: number; points: StrokePoint[] };
type DrawTool = 'pen' | 'eraser';

function sanitizeHtml(html: string) {
  if (typeof window === 'undefined') return html;
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith('on') || value.startsWith('javascript:')) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
}

function safeStrokes(value: unknown): Stroke[] {
  if (!Array.isArray(value)) return [];
  return value.filter((stroke): stroke is Stroke =>
    typeof stroke === 'object'
    && stroke !== null
    && typeof (stroke as Stroke).color === 'string'
    && typeof (stroke as Stroke).size === 'number'
    && Array.isArray((stroke as Stroke).points)
  );
}

export default function PersonalScroll({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draftRef = useRef('');
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [stylusMode, setStylusMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>('pen');
  const [brushColor, setBrushColor] = useState('#f3e5c7');
  const [brushSize, setBrushSize] = useState(5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  function drawAll(extra?: Stroke | null) {
    const canvas = canvasRef.current;
    const scroll = scrollRef.current;
    if (!canvas || !scroll || typeof window === 'undefined') return;
    const rect = scroll.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    [...strokesRef.current, ...(extra ? [extra] : [])].forEach((stroke) => {
      if (stroke.points.length < 1) return;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      stroke.points.forEach((point, index) => {
        const x = point.x * rect.width;
        const y = point.y * rect.height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  useEffect(() => {
    strokesRef.current = strokes;
    drawAll();
  }, [strokes]);

  useEffect(() => {
    if (!loaded) return;
    const resize = new ResizeObserver(() => drawAll());
    const handleResize = () => drawAll();
    if (scrollRef.current) resize.observe(scrollRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      resize.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [loaded]);

  useEffect(() => {
    async function loadScroll() {
      const { data } = await supabase
        .from('personal_scrolls')
        .select('content_html,drawing_data')
        .eq('user_id', profile.id)
        .maybeSingle();

      const html = sanitizeHtml(data?.content_html ?? '');
      const drawing = safeStrokes(data?.drawing_data);
      draftRef.current = html;
      strokesRef.current = drawing;
      if (editorRef.current) editorRef.current.innerHTML = html;
      setStrokes(drawing);
      setLoaded(true);
      window.requestAnimationFrame(() => drawAll());
    }

    loadScroll();
  }, [profile.id, supabase]);

  useEffect(() => {
    if (!dirty || !loaded) return;
    const timeout = window.setTimeout(() => { void saveScroll(); }, 900);
    return () => window.clearTimeout(timeout);
  }, [dirty, loaded, strokes]);

  function markDirty() {
    setDirty(true);
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    draftRef.current = sanitizeHtml(editorRef.current?.innerHTML ?? '');
    markDirty();
  }

  async function saveScroll() {
    if (!loaded) return;
    const content_html = sanitizeHtml(draftRef.current);
    await supabase
      .from('personal_scrolls')
      .upsert({ user_id: profile.id, content_html, drawing_data: strokesRef.current }, { onConflict: 'user_id' });
    setDirty(false);
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function eraseAt(point: StrokePoint) {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    const radius = brushSize * 1.6;
    const next = strokesRef.current.filter((stroke) => !stroke.points.some((strokePoint) => {
      const dx = (strokePoint.x - point.x) * rect.width;
      const dy = (strokePoint.y - point.y) * rect.height;
      return Math.hypot(dx, dy) <= radius;
    }));
    if (next.length !== strokesRef.current.length) {
      setStrokes(next);
      setRedoStack([]);
      markDirty();
    }
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!stylusMode) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    if (drawTool === 'eraser') {
      eraseAt(point);
      drawingRef.current = true;
      return;
    }
    currentStrokeRef.current = { color: brushColor, size: brushSize, points: [point] };
    drawingRef.current = true;
  }

  function moveDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!stylusMode || !drawingRef.current) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (drawTool === 'eraser') {
      eraseAt(point);
      return;
    }
    const current = currentStrokeRef.current;
    if (!current) return;
    current.points.push(point);
    drawAll(current);
  }

  function finishDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const current = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (current && current.points.length > 0) {
      const next = [...strokesRef.current, current];
      setStrokes(next);
      setRedoStack([]);
      markDirty();
    }
  }

  function undoDrawing() {
    const last = strokesRef.current[strokesRef.current.length - 1];
    if (!last) return;
    setStrokes(strokesRef.current.slice(0, -1));
    setRedoStack((current) => [last, ...current]);
    markDirty();
  }

  function redoDrawing() {
    const [next, ...rest] = redoStack;
    if (!next) return;
    setStrokes([...strokesRef.current, next]);
    setRedoStack(rest);
    markDirty();
  }

  return (
    <section className="surface rounded-2xl p-4 sm:p-6">
      <h2 className="personal-scroll-title text-center text-4xl font-black tracking-[-0.035em]">Personal Scroll</h2>

      <div className="mx-auto mt-5 max-w-4xl">
        <div className="mb-3 rounded-2xl border border-[var(--line)] bg-black/20 p-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button onClick={() => setStylusMode(false)} className={`rounded-xl px-3 py-2 text-xs font-black ${!stylusMode ? 'bg-[var(--paper)] text-[#141915]' : 'border border-[var(--line)] text-[var(--muted)]'}`}><Type size={15} className="mr-1 inline" /> Text</button>
            <button onClick={() => setStylusMode(true)} className={`rounded-xl px-3 py-2 text-xs font-black ${stylusMode ? 'bg-[var(--paper)] text-[#141915]' : 'border border-[var(--line)] text-[var(--muted)]'}`}><Brush size={15} className="mr-1 inline" /> Stylus mode</button>
          </div>

          {!stylusMode ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { command: 'formatBlock', value: '<h1>', label: 'H1', icon: Heading1 },
                { command: 'formatBlock', value: '<h2>', label: 'H2', icon: Heading2 },
                { command: 'formatBlock', value: '<h3>', label: 'H3', icon: Heading3 },
                { command: 'formatBlock', value: '<p>', label: 'P', icon: Pilcrow },
                { command: 'bold', label: 'Bold', icon: Bold },
                { command: 'italic', label: 'Italic', icon: Italic },
                { command: 'underline', label: 'Underline', icon: Underline },
                { command: 'strikeThrough', label: 'Strike', icon: Strikethrough },
                { command: 'insertUnorderedList', label: 'Bullets', icon: List },
                { command: 'insertOrderedList', label: 'Numbers', icon: ListOrdered },
                { command: 'justifyLeft', label: 'Left', icon: AlignLeft },
                { command: 'justifyCenter', label: 'Center', icon: AlignCenter },
                { command: 'justifyRight', label: 'Right', icon: AlignRight },
                { command: 'formatBlock', value: '<blockquote>', label: 'Quote', icon: Quote }
              ].map(({ command, value, label, icon: Icon }) => (
                <button key={`${command}-${value ?? label}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand(command, value)} className="rounded-xl border border-[var(--line)] bg-black/20 p-2.5 text-[var(--muted)] transition active:scale-95" aria-label={label} title={label}>
                  <Icon size={17} />
                </button>
              ))}
              <select className="field w-auto py-2 text-xs" onChange={(event) => runCommand('fontSize', event.target.value)} defaultValue="">
                <option value="" disabled>Size</option>
                <option value="2">Small</option>
                <option value="3">Normal</option>
                <option value="5">Large</option>
                <option value="7">Huge</option>
              </select>
              <label className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-black/20" title="Text color">
                <input className="h-14 w-14 cursor-pointer border-0 bg-transparent p-0" type="color" defaultValue="#f3e5c7" onChange={(event) => runCommand('foreColor', event.target.value)} aria-label="Text color" />
              </label>
              <label className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-black/20 text-[var(--muted)]" title="Highlight">
                <Highlighter size={15} className="absolute" />
                <input className="h-14 w-14 cursor-pointer border-0 bg-transparent p-0 opacity-0" type="color" defaultValue="#8a6038" onChange={(event) => runCommand('backColor', event.target.value)} aria-label="Highlight color" />
              </label>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => setDrawTool('pen')} className={`rounded-xl px-3 py-2 text-xs font-black ${drawTool === 'pen' ? 'bg-[var(--paper)] text-[#141915]' : 'border border-[var(--line)] text-[var(--muted)]'}`}><Brush size={15} className="mr-1 inline" /> Draw</button>
              <button onClick={() => setDrawTool('eraser')} className={`rounded-xl px-3 py-2 text-xs font-black ${drawTool === 'eraser' ? 'bg-[var(--paper)] text-[#141915]' : 'border border-[var(--line)] text-[var(--muted)]'}`}><Eraser size={15} className="mr-1 inline" /> Erase</button>
              <button onClick={undoDrawing} className="rounded-xl border border-[var(--line)] bg-black/20 p-2.5 text-[var(--muted)]" aria-label="Undo drawing"><Undo2 size={17} /></button>
              <button onClick={redoDrawing} className="rounded-xl border border-[var(--line)] bg-black/20 p-2.5 text-[var(--muted)]" aria-label="Redo drawing"><Redo2 size={17} /></button>
              <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-xs font-black text-[var(--muted)]">
                Size
                <input type="range" min={2} max={34} value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
              </label>
              <label className="grid grid-cols-[auto_5rem] items-center gap-2 rounded-xl border border-[var(--line)] bg-black/20 px-3 py-2 text-xs font-black text-[var(--muted)]">
                Color
                <input className="h-8 w-full rounded-lg border border-[var(--line)] bg-black/20" type="color" value={brushColor} onChange={(event) => setBrushColor(event.target.value)} />
              </label>
            </div>
          )}
        </div>

        <div ref={scrollRef} className="relative isolate overflow-hidden rounded-2xl border border-[#d1a85b35] bg-[#120904d9]">
          <div
            ref={editorRef}
            className="personal-scroll-editor relative z-0 min-h-[62vh] p-4 text-base leading-7 outline-none sm:p-6"
            contentEditable={!stylusMode}
            suppressContentEditableWarning
            onInput={() => {
              draftRef.current = sanitizeHtml(editorRef.current?.innerHTML ?? '');
              markDirty();
            }}
            onBlur={() => { void saveScroll(); }}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-[1] h-full w-full rounded-2xl ${stylusMode ? 'touch-none cursor-crosshair' : 'pointer-events-none'}`}
            onPointerDown={startDrawing}
            onPointerMove={moveDrawing}
            onPointerUp={finishDrawing}
            onPointerCancel={finishDrawing}
          />
        </div>
      </div>
    </section>
  );
}
