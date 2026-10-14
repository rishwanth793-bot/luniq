/**
 * Light Angle Indicator Component
 * Subtle, scientific circular indicator showing the direction of incoming sunlight
 * onto the lunar surface corresponding to the user-entered Light Projection Angle (0°–360°).
 *
 * Supports interactive clicking/dragging to adjust angle, cardinal direction ticks,
 * and high-contrast SVG graphics.
 */

import React, { useId, useRef, useState, useCallback } from 'react';

interface LightAngleIndicatorProps {
  angle?: number | null;
  size?: number;
  className?: string;
  showDegreesBadge?: boolean;
  interactive?: boolean;
  onAngleChange?: (angle: number) => void;
}

export const LightAngleIndicator: React.FC<LightAngleIndicatorProps> = ({
  angle,
  size = 44,
  className = '',
  showDegreesBadge = false,
  interactive = false,
  onAngleChange,
}) => {
  const markerId = useId().replace(/:/g, '_');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isProvided = typeof angle === 'number' && !isNaN(angle) && angle !== null;
  const normalizedAngle = isProvided ? ((angle % 360) + 360) % 360 : null;

  const center = size / 2;
  const outerRadius = size / 2 - 3;
  const innerLunarRadius = Math.max(5, size * 0.18);
  const orbitRadius = outerRadius - 3;

  // Calculate angle from pointer event relative to center
  const calculateAngleFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = clientX - (rect.left + rect.width / 2);
      const clickY = clientY - (rect.top + rect.height / 2);

      // 0° = North (clickX = 0, clickY < 0). atan2(x, -y) clockwise from 12 o'clock
      let rad = Math.atan2(clickX, -clickY);
      let deg = Math.round((rad * 180) / Math.PI);
      if (deg < 0) deg += 360;
      if (deg === 360) deg = 0;
      onAngleChange?.(deg);
    },
    [onAngleChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !onAngleChange) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    calculateAngleFromEvent(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !interactive || !onAngleChange) return;
    calculateAngleFromEvent(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if not captured
      }
    }
  };

  // Calculate sun position based on angle
  // 0° = North (top), 90° = East (right), 180° = South (bottom), 270° = West (left)
  let sunX = center;
  let sunY = center;
  let rayStartX = center;
  let rayStartY = center;
  let rayEndX = center;
  let rayEndY = center;

  if (normalizedAngle !== null) {
    const rad = (normalizedAngle * Math.PI) / 180;
    // Sun position on perimeter
    sunX = center + orbitRadius * Math.sin(rad);
    sunY = center - orbitRadius * Math.cos(rad);

    // Ray points from sun toward the center lunar target
    const rayStartDist = orbitRadius - 4;
    const rayEndDist = innerLunarRadius + 3;

    rayStartX = center + rayStartDist * Math.sin(rad);
    rayStartY = center - rayStartDist * Math.cos(rad);

    rayEndX = center + rayEndDist * Math.sin(rad);
    rayEndY = center - rayEndDist * Math.cos(rad);
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex items-center justify-center shrink-0 select-none ${
          interactive ? 'cursor-crosshair active:scale-95 transition-transform' : ''
        }`}
        style={{ width: size, height: size, touchAction: interactive ? 'none' : 'auto' }}
        title={
          interactive
            ? isProvided
              ? `Sun illumination angle: ${normalizedAngle}° (Click/drag ring to rotate)`
              : 'Click or drag around the dial to set Light Projection Angle'
            : isProvided
            ? `Sun illumination angle: ${normalizedAngle}°`
            : 'Light Angle: Not Provided'
        }
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <defs>
            {/* Unique Arrowhead marker for directional ray */}
            <marker
              id={`arrow-${markerId}`}
              viewBox="0 0 6 6"
              refX="4"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 5 3 L 0 5 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Outer compass ring */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="rgba(11, 15, 25, 0.9)"
            stroke={
              isProvided
                ? 'rgba(56, 189, 248, 0.4)'
                : interactive
                ? 'rgba(148, 163, 184, 0.5)'
                : 'rgba(71, 85, 105, 0.35)'
            }
            strokeWidth={interactive ? '1.5' : '1'}
            strokeDasharray={isProvided ? 'none' : '2 2'}
          />

          {/* Cardinal direction crosshair ticks (N, E, S, W) */}
          <line
            x1={center}
            y1={center - outerRadius}
            x2={center}
            y2={center - outerRadius + 3}
            stroke="rgba(245, 158, 11, 0.8)"
            strokeWidth="1.5"
          />
          <line
            x1={center + outerRadius}
            y1={center}
            x2={center + outerRadius - 2.5}
            y2={center}
            stroke="rgba(148, 163, 184, 0.5)"
            strokeWidth="1"
          />
          <line
            x1={center}
            y1={center + outerRadius}
            x2={center}
            y2={center + outerRadius - 2.5}
            stroke="rgba(148, 163, 184, 0.5)"
            strokeWidth="1"
          />
          <line
            x1={center - outerRadius}
            y1={center}
            x2={center - outerRadius + 2.5}
            y2={center}
            stroke="rgba(148, 163, 184, 0.5)"
            strokeWidth="1"
          />

          {/* Center Lunar Target Surface */}
          <circle
            cx={center}
            cy={center}
            r={innerLunarRadius}
            fill="#1e293b"
            stroke={isProvided ? '#38bdf8' : '#475569'}
            strokeWidth="1"
          />

          {/* Lunar crater detail */}
          <circle
            cx={center - 1.2}
            cy={center - 1}
            r={innerLunarRadius * 0.35}
            fill="none"
            stroke="rgba(148, 163, 184, 0.4)"
            strokeWidth="0.5"
          />

          {isProvided ? (
            <g>
              {/* Directional incoming light vector */}
              <line
                x1={rayStartX}
                y1={rayStartY}
                x2={rayEndX}
                y2={rayEndY}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="2 1.5"
                markerEnd={`url(#arrow-${markerId})`}
              />

              {/* Sun body ☀ */}
              <circle
                cx={sunX}
                cy={sunY}
                r={Math.max(3, size * 0.085)}
                fill="#fbbf24"
                stroke="#d97706"
                strokeWidth="1"
              />

              {/* Sun halo / glow */}
              <circle
                cx={sunX}
                cy={sunY}
                r={Math.max(4.5, size * 0.13)}
                fill="none"
                stroke="rgba(251, 191, 36, 0.45)"
                strokeWidth="1"
              />
            </g>
          ) : (
            /* 'Not provided' state */
            <text
              x={center}
              y={center + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 font-mono text-[8px] select-none"
            >
              {interactive ? 'SET' : '–'}
            </text>
          )}
        </svg>
      </div>

      {showDegreesBadge && (
        <span
          className={`font-mono text-xs font-semibold ${
            isProvided ? 'text-amber-300' : 'text-slate-500 italic'
          }`}
        >
          {isProvided ? `${normalizedAngle}°` : 'LIGHT ANGLE: NOT PROVIDED'}
        </span>
      )}
    </div>
  );
};
