'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CubicBezierEditorProps {
  value: [number, number, number, number];
  onChange: (value: [number, number, number, number]) => void;
  disabled?: boolean;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function CubicBezierEditor({
  value,
  onChange,
  disabled = false,
}: CubicBezierEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  const width = 240;
  const height = 240;

  const toCanvasPoint = (x: number, y: number) => ({
    x: x * width,
    y: height - y * height,
  });

  const p0 = { x: 0, y: height };
  const p3 = { x: width, y: 0 };
  const c1 = toCanvasPoint(value[0], value[1]);
  const c2 = toCanvasPoint(value[2], value[3]);

  const handlePointerDown = (point: 'p1' | 'p2') => (event: React.PointerEvent) => {
    if (disabled) return;
    event.preventDefault();
    setDragging(point);
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragging || disabled) {
      return;
    }
    event.preventDefault();

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const relativeX = clamp((event.clientX - rect.left) / rect.width);
    const relativeY = clamp(1 - (event.clientY - rect.top) / rect.height);
    const nextValue: [number, number, number, number] =
      dragging === 'p1'
        ? [relativeX, relativeY, value[2], value[3]]
        : [value[0], value[1], relativeX, relativeY];
    onChange(nextValue);
  };

  const stopDragging = (event: React.PointerEvent) => {
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    setDragging(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative w-full rounded-lg border border-border bg-muted/50 p-4">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="h-60 w-full touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerLeave={() => setDragging(null)}
        >
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            className="fill-background"
          />
          <line
            x1={p0.x}
            y1={p0.y}
            x2={p3.x}
            y2={p3.y}
            className="stroke-muted-foreground/40"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <line
            x1={p0.x}
            y1={p0.y}
            x2={c1.x}
            y2={c1.y}
            className="stroke-primary/40"
            strokeWidth={1}
          />
          <line
            x1={p3.x}
            y1={p3.y}
            x2={c2.x}
            y2={c2.y}
            className="stroke-primary/40"
            strokeWidth={1}
          />
          <path
            d={`M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`}
            className="stroke-primary"
            strokeWidth={2}
            fill="none"
          />
          <HandleCircle
            cx={c1.x}
            cy={c1.y}
            active={dragging === 'p1'}
            onPointerDown={handlePointerDown('p1')}
            disabled={disabled}
          />
          <HandleCircle
            cx={c2.x}
            cy={c2.y}
            active={dragging === 'p2'}
            onPointerDown={handlePointerDown('p2')}
            disabled={disabled}
          />
        </svg>
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

interface HandleCircleProps {
  cx: number;
  cy: number;
  active: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  disabled: boolean;
}

function HandleCircle({
  cx,
  cy,
  active,
  onPointerDown,
  disabled,
}: HandleCircleProps) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={8}
      className={cn(
        'cursor-pointer stroke-foreground fill-background transition-colors',
        active && 'fill-primary/80',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      onPointerDown={onPointerDown}
    />
  );
}
