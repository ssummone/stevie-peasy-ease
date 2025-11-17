'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface CubicBezierEditorProps {
  value: [number, number, number, number];
  onChange: (value: [number, number, number, number]) => void;
  disabled?: boolean;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const DEFAULT_SIZE = 320;
const HANDLE_RADIUS = 14;

export function CubicBezierEditor({
  value,
  onChange,
  disabled = false,
}: CubicBezierEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const valueRef = useRef(value);
  const draggingHandleRef = useRef<'p1' | 'p2' | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'p1' | 'p2' | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_SIZE, height: DEFAULT_SIZE });

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const getCanvasDimensions = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      width: rect?.width || DEFAULT_SIZE,
      height: rect?.height || DEFAULT_SIZE,
    };
  };

  const getHandlePoints = () => {
    const { width, height } = getCanvasDimensions();
    return {
      p0: { x: 0, y: height },
      p3: { x: width, y: 0 },
      c1: { x: value[0] * width, y: height - value[1] * height },
      c2: { x: value[2] * width, y: height - value[3] * height },
      width,
      height,
    };
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width: displayWidth, height: displayHeight, p0, p3, c1, c2 } = getHandlePoints();
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== displayWidth * ratio || canvas.height !== displayHeight * ratio) {
      canvas.width = displayWidth * ratio;
      canvas.height = displayHeight * ratio;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(ratio, ratio);

    const getCssColor = (token: string, fallback: string) => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(token)
        .trim();
      return value || fallback;
    };

    const backgroundColor = getCssColor('--background', '#09090b');
    const borderColor = getCssColor('--border', 'rgba(255,255,255,0.12)');
    const mutedColor = getCssColor('--muted-foreground', 'rgba(255,255,255,0.35)');
    const primaryColor = getCssColor('--primary', '#a855f7');

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Diagonal guide
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = mutedColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Helper lines
    ctx.strokeStyle = `${primaryColor}33`;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(c1.x, c1.y);
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.stroke();

    // Curve
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y);
    ctx.stroke();

    // Handles
    const drawHandle = (point: { x: number; y: number }, active: boolean) => {
      ctx.fillStyle = active ? primaryColor : backgroundColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };

    drawHandle(c1, draggingHandle === 'p1');
    drawHandle(c2, draggingHandle === 'p2');

    setCanvasSize((prev) =>
      prev.width === displayWidth && prev.height === displayHeight
        ? prev
        : { width: displayWidth, height: displayHeight }
    );
  }, [value, draggingHandle]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => drawCanvas());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawCanvas]);

  const updateHandleFromClient = useCallback(
    (handle: 'p1' | 'p2', clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || DEFAULT_SIZE;
      const height = rect.height || DEFAULT_SIZE;
      const normalizedX = clamp((clientX - rect.left) / width);
      const normalizedY = clamp(1 - (clientY - rect.top) / height);
      const current = valueRef.current;
      const nextValue: [number, number, number, number] =
        handle === 'p1'
          ? [normalizedX, normalizedY, current[2], current[3]]
          : [current[0], current[1], normalizedX, normalizedY];
      onChange(nextValue);
    },
    [onChange]
  );

  const startDragging = useCallback(
    (handle: 'p1' | 'p2', event: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      event.preventDefault();
      draggingHandleRef.current = handle;
      setDraggingHandle(handle);
      updateHandleFromClient(handle, event.clientX, event.clientY);
    },
    [disabled, updateHandleFromClient]
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const handle = draggingHandleRef.current;
      if (!handle || disabled) return;
      event.preventDefault();
      updateHandleFromClient(handle, event.clientX, event.clientY);
    };

    const stopDragging = () => {
      if (!draggingHandleRef.current) return;
      draggingHandleRef.current = null;
      setDraggingHandle(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [disabled, updateHandleFromClient]);

  const handleStyle = (x: number, y: number) => ({
    left: `${(x * 100).toFixed(2)}%`,
    top: `${((1 - y) * 100).toFixed(2)}%`,
  });

  return (
    <div className="space-y-3">
      <div className="relative w-full rounded-lg border border-border bg-muted/50 p-4">
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full select-none"
          />
          <button
            type="button"
            aria-label="Adjust control point 1"
            className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-background/80 bg-primary/80 shadow transition active:cursor-grabbing active:scale-95 disabled:cursor-not-allowed disabled:pointer-events-none ${
              draggingHandle === 'p1' ? 'ring-2 ring-primary/80' : ''
            }`}
            style={handleStyle(value[0], value[1])}
            onPointerDown={(event) => startDragging('p1', event)}
            disabled={disabled}
          />
          <button
            type="button"
            aria-label="Adjust control point 2"
            className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-background/80 bg-primary/80 shadow transition active:cursor-grabbing active:scale-95 disabled:cursor-not-allowed disabled:pointer-events-none ${
              draggingHandle === 'p2' ? 'ring-2 ring-primary/80' : ''
            }`}
            style={handleStyle(value[2], value[3])}
            onPointerDown={(event) => startDragging('p2', event)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">Control Point 1</p>
          <p>x: {value[0].toFixed(2)}</p>
          <p>y: {value[1].toFixed(2)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">Control Point 2</p>
          <p>x: {value[2].toFixed(2)}</p>
          <p>y: {value[3].toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
