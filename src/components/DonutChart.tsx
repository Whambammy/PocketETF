'use client';

import React, { useState } from 'react';

export interface DonutSegment {
  ticker: string;
  name: string;
  weightPercent: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
}

export function DonutChart({
  segments,
  size = 200,
  strokeWidth = 24,
}: DonutChartProps) {
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalWeight = segments.reduce((sum, s) => sum + s.weightPercent, 0);

  let accumulatedOffset = 0;

  const hoveredSegment = segments.find((s) => s.ticker === hoveredTicker);

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          {/* Base Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1a1c29"
            strokeWidth={strokeWidth}
          />

          {/* Dynamic Segments */}
          {segments.map((segment) => {
            const pct = totalWeight > 0 ? segment.weightPercent / totalWeight : 0;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedOffset;
            accumulatedOffset += pct * circumference;

            const isHovered = hoveredTicker === segment.ticker;

            return (
              <circle
                key={segment.ticker}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredTicker(segment.ticker)}
                onMouseLeave={() => setHoveredTicker(null)}
                style={{
                  filter: isHovered ? `drop-shadow(0 0 8px ${segment.color}88)` : 'none',
                  opacity: hoveredTicker && !isHovered ? 0.4 : 1,
                }}
              />
            );
          })}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {hoveredSegment ? (
            <>
              <span className="text-[11px] font-mono text-gray-400 font-semibold uppercase">
                {hoveredSegment.ticker}
              </span>
              <span className="text-xl font-extrabold text-white font-mono">
                {hoveredSegment.weightPercent}%
              </span>
              <span className="text-[9px] text-gray-500 truncate max-w-[80px]">
                {hoveredSegment.name}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-mono text-gray-400 font-semibold uppercase tracking-wider">
                Total
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {totalWeight}%
              </span>
              <span className="text-[9px] text-emerald-400 font-mono font-medium">
                {segments.length} {segments.length === 1 ? 'Asset' : 'Assets'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default DonutChart;
