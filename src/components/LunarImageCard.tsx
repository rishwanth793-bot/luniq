/**
 * Lunar Image Card Component
 * Individual observation frame card with:
 * - Real-time responsive Light Projection Angle (0°–360°) with interactive dial & slider
 * - Live directional lighting overlay corresponding to the sun vector
 * - Brightness (50%–150%) & Contrast (50%–200%) controls affecting the lunar preview in real-time
 * - 'Change Again' quick action bar with instant presets and reset functionality
 * - Replace, reorder, and remove frame controls
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  SunMedium,
  Contrast,
  SlidersHorizontal,
  RotateCcw,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Compass,
  Check,
} from 'lucide-react';
import { Observation } from '../types.ts';
import { LightAngleIndicator } from './LightAngleIndicator.tsx';

interface LunarImageCardProps {
  obs: Observation;
  index: number;
  totalCount: number;
  onMove: (index: number, direction: 'left' | 'right') => void;
  onReplace: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateAdjustments: (
    id: string,
    adjustments: {
      light_projection_angle?: number | null;
      brightness?: number;
      contrast?: number;
    }
  ) => void;
  isProcessing?: boolean;
}

export const LunarImageCard: React.FC<LunarImageCardProps> = ({
  obs,
  index,
  totalCount,
  onMove,
  onReplace,
  onRemove,
  onUpdateAdjustments,
  isProcessing = false,
}) => {
  // Local reactive states for zero-latency sliders
  const [angle, setAngle] = useState<number | null>(
    obs.light_projection_angle !== undefined ? obs.light_projection_angle : null
  );
  const [brightness, setBrightness] = useState<number>(obs.brightness ?? 100);
  const [contrast, setContrast] = useState<number>(obs.contrast ?? 100);
  const [showQuickPresets, setShowQuickPresets] = useState<boolean>(false);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Keep local state in sync if parent observation changes externally
  useEffect(() => {
    setAngle(obs.light_projection_angle !== undefined ? obs.light_projection_angle : null);
  }, [obs.light_projection_angle]);

  useEffect(() => {
    setBrightness(obs.brightness ?? 100);
  }, [obs.brightness]);

  useEffect(() => {
    setContrast(obs.contrast ?? 100);
  }, [obs.contrast]);

  // Debounced server sync timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const commitAdjustments = (newAngle: number | null, newBrightness: number, newContrast: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onUpdateAdjustments(obs.id, {
        light_projection_angle: newAngle,
        brightness: newBrightness,
        contrast: newContrast,
      });
    }, 200);
  };

  const handleAngleChange = (newAngle: number | null) => {
    const clamped =
      newAngle !== null && !isNaN(newAngle)
        ? Math.min(360, Math.max(0, Math.round(newAngle)))
        : null;
    setAngle(clamped);
    commitAdjustments(clamped, brightness, contrast);
  };

  const handleBrightnessChange = (val: number) => {
    const clamped = Math.min(150, Math.max(50, Math.round(val)));
    setBrightness(clamped);
    commitAdjustments(angle, clamped, contrast);
  };

  const handleContrastChange = (val: number) => {
    const clamped = Math.min(200, Math.max(50, Math.round(val)));
    setContrast(clamped);
    commitAdjustments(angle, brightness, clamped);
  };

  const handleResetToDefaults = () => {
    setBrightness(100);
    setContrast(100);
    // Keep angle or reset if desired: resets visual enhancements
    commitAdjustments(angle, 100, 100);
    showFeedback('Reset to Defaults (100% / 100%)');
  };

  const handleApplyPreset = (presetName: string, b: number, c: number, defaultAngle?: number) => {
    const nextAngle = defaultAngle !== undefined ? defaultAngle : angle;
    setBrightness(b);
    setContrast(c);
    if (defaultAngle !== undefined) {
      setAngle(nextAngle);
    }
    commitAdjustments(nextAngle, b, c);
    showFeedback(`Applied: ${presetName}`);
  };

  const showFeedback = (msg: string) => {
    setAppliedFeedback(msg);
    setTimeout(() => setAppliedFeedback(null), 1800);
  };

  const imgNumber = `IMAGE ${String(index + 1).padStart(2, '0')}`;
  const hasAngle = angle !== null && angle !== undefined && !isNaN(angle);

  // Directional illumination gradient overlay angle:
  // If sunlight comes from angle θ (e.g. 90° East), the illumination falls from East (90°) towards West (270°).
  const gradientAngle = hasAngle ? (angle + 180) % 360 : 0;

  return (
    <div
      id={`lunar-card-${obs.id}`}
      className="rounded-xl bg-[#0c0f16] border border-slate-800 hover:border-slate-700 p-4 flex flex-col justify-between space-y-3.5 shadow-lg transition"
    >
      {/* 1. Header: Image Number, Observation Letter Code, and Card Actions */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">
            {imgNumber}
          </span>
          <span className="w-5 h-5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center">
            {obs.code}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Reorder Left */}
          <button
            onClick={() => onMove(index, 'left')}
            disabled={index === 0 || isProcessing}
            title="Move Left / Earlier in sequence"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Reorder Right */}
          <button
            onClick={() => onMove(index, 'right')}
            disabled={index === totalCount - 1 || isProcessing}
            title="Move Right / Later in sequence"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent transition"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Replace Image */}
          <button
            onClick={() => onReplace(obs.id)}
            disabled={isProcessing}
            title="Replace this lunar frame"
            className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Remove Image */}
          <button
            onClick={() => onRemove(obs.id)}
            disabled={isProcessing}
            title="Remove this observation"
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Image Preview Container with live Brightness & Contrast & Directional Light Overlay */}
      <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group select-none">
        {obs.data_url ? (
          <img
            src={obs.data_url}
            alt={obs.name || imgNumber}
            className="w-full h-full object-cover transition-all duration-150"
            style={{
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
            }}
          />
        ) : (
          <div className="text-slate-600 font-mono text-xs">No image data</div>
        )}

        {/* Dynamic Light Direction Illumination Overlay on Lunar Surface */}
        {hasAngle && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300"
            style={{
              background: `linear-gradient(${gradientAngle}deg, rgba(254, 240, 138, 0.28) 0%, rgba(0, 0, 0, 0) 50%, rgba(2, 6, 23, 0.45) 100%)`,
            }}
          />
        )}

        {/* Interactive Corner Circular Dial: Click/Drag to rotate sunlight vector */}
        <div
          className="absolute top-2 right-2 p-1 rounded-full bg-slate-950/85 backdrop-blur border border-slate-700/80 shadow-lg"
          title="Click or drag around dial ring to set Light Projection Angle"
        >
          <LightAngleIndicator
            angle={angle}
            size={40}
            interactive={!isProcessing}
            onAngleChange={(newDeg) => handleAngleChange(newDeg)}
          />
        </div>

        {/* Bottom-left adjustment HUD badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur border border-slate-800 text-[10px] font-mono text-slate-300 shadow">
          <span>{hasAngle ? `☀ ${angle}°` : '☀ N/A'}</span>
          <span className="text-slate-600">•</span>
          <span>B: {brightness}%</span>
          <span className="text-slate-600">•</span>
          <span>C: {contrast}%</span>
        </div>

        {/* Live applied feedback alert pill */}
        {appliedFeedback && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500/50 text-[10px] font-mono text-cyan-200 shadow-md animate-fade-in">
            <Check className="w-3 h-3 text-cyan-400" />
            <span>{appliedFeedback}</span>
          </div>
        )}
      </div>

      {/* 3. Filename & Resolution metadata */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
        <span className="truncate max-w-[170px]" title={obs.filename || obs.name}>
          {obs.filename || obs.name}
        </span>
        <span className="text-slate-400 shrink-0">
          {obs.width && obs.height ? `${obs.width} × ${obs.height} px` : 'Custom res'}
        </span>
      </div>

      {/* 4. LIGHT PROJECTION ANGLE SECTION */}
      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-mono font-semibold">
            <Sun className="w-3.5 h-3.5" />
            <span>LIGHT PROJECTION ANGLE</span>
          </div>

          {/* Value Display: e.g. 35° or LIGHT ANGLE: NOT PROVIDED */}
          <div className="font-mono text-xs font-bold">
            {hasAngle ? (
              <span className="text-amber-300 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40">
                {angle}°
              </span>
            ) : (
              <span className="text-slate-400 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                LIGHT ANGLE: NOT PROVIDED
              </span>
            )}
          </div>
        </div>

        {/* Input field + Clear button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              max="360"
              step="1"
              placeholder="0°–360°"
              value={hasAngle ? angle : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  handleAngleChange(null);
                } else {
                  const num = parseFloat(val);
                  handleAngleChange(isNaN(num) ? null : num);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400 pr-6"
            />
            <span className="absolute right-2.5 top-1 font-mono text-xs text-slate-400 pointer-events-none">
              °
            </span>
          </div>

          {hasAngle ? (
            <button
              onClick={() => handleAngleChange(null)}
              title="Clear angle (set to Not Provided)"
              className="text-[10px] font-mono text-slate-400 hover:text-amber-300 px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            >
              Clear
            </button>
          ) : (
            <button
              onClick={() => handleAngleChange(45)}
              title="Set default 45° angle"
              className="text-[10px] font-mono text-amber-400 hover:text-amber-200 px-2 py-1 rounded bg-amber-950/40 border border-amber-500/40 hover:bg-amber-950/70 transition"
            >
              Set 45°
            </button>
          )}
        </div>

        {/* Smooth 0°–360° Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={hasAngle ? angle : 0}
            onChange={(e) => handleAngleChange(parseInt(e.target.value, 10))}
            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Quick Cardinal Direction Chips */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[9px] font-mono text-slate-400 mr-0.5">Presets:</span>
          {[
            { label: '0° N', deg: 0 },
            { label: '45° NE', deg: 45 },
            { label: '90° E', deg: 90 },
            { label: '135° SE', deg: 135 },
            { label: '180° S', deg: 180 },
            { label: '225° SW', deg: 225 },
            { label: '270° W', deg: 270 },
          ].map((preset) => (
            <button
              key={preset.deg}
              onClick={() => handleAngleChange(preset.deg)}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition ${
                angle === preset.deg
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. BRIGHTNESS & CONTRAST SECTION (Below Light Projection Angle) */}
      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-cyan-300 border-b border-slate-800/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>IMAGE ADJUSTMENTS</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">Real-time live view</span>
        </div>

        {/* Brightness Control Option */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <SunMedium className="w-3 h-3 text-cyan-400" />
              <span>BRIGHTNESS</span>
            </span>
            <span
              className={`font-bold ${
                brightness !== 100 ? 'text-cyan-300' : 'text-slate-400'
              }`}
            >
              {brightness}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="50"
              max="150"
              step="1"
              value={brightness}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
            <span>50% (Dark)</span>
            <span>100% (Normal)</span>
            <span>150% (Bright)</span>
          </div>
        </div>

        {/* Contrast Control Option */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Contrast className="w-3 h-3 text-cyan-400" />
              <span>CONTRAST</span>
            </span>
            <span
              className={`font-bold ${
                contrast !== 100 ? 'text-cyan-300' : 'text-slate-400'
              }`}
            >
              {contrast}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="50"
              max="200"
              step="1"
              value={contrast}
              onChange={(e) => handleContrastChange(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
            <span>50% (Flat)</span>
            <span>100% (Standard)</span>
            <span>200% (Punchy)</span>
          </div>
        </div>

        {/* 6. 'CHANGE AGAIN' & RESET ACTION BAR (Below Light Projection Angle & Sliders) */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            {/* Change Again Button */}
            <button
              onClick={() => setShowQuickPresets(!showQuickPresets)}
              title="Change again with quick enhance presets"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 font-mono text-[11px] font-semibold transition"
            >
              <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
              <span>{showQuickPresets ? 'Hide Presets' : 'Change Again'}</span>
            </button>

            {/* Reset to Defaults Button */}
            <button
              onClick={handleResetToDefaults}
              disabled={brightness === 100 && contrast === 100}
              title="Reset brightness and contrast to standard 100%"
              className="inline-flex items-center justify-center gap-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-mono text-[10px] transition disabled:opacity-30 disabled:hover:bg-slate-900"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Quick Preset Options below Change Again */}
          {showQuickPresets && (
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800 space-y-1.5 animate-fade-in">
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Click preset to change again:
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleApplyPreset('Default', 100, 100)}
                  className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 text-left transition"
                >
                  <div className="font-semibold">Standard</div>
                  <div className="text-[8px] text-slate-400">B: 100% • C: 100%</div>
                </button>
                <button
                  onClick={() => handleApplyPreset('Shadow Boost', 125, 115)}
                  className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 text-left transition"
                >
                  <div className="font-semibold text-cyan-300">Shadow Boost</div>
                  <div className="text-[8px] text-slate-400">B: 125% • C: 115%</div>
                </button>
                <button
                  onClick={() => handleApplyPreset('High Relief', 95, 145)}
                  className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 text-left transition"
                >
                  <div className="font-semibold text-amber-300">High Relief</div>
                  <div className="text-[8px] text-slate-400">B: 95% • C: 145%</div>
                </button>
                <button
                  onClick={() => handleApplyPreset('Albedo Map', 110, 85)}
                  className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-300 text-left transition"
                >
                  <div className="font-semibold text-emerald-300">Albedo Regolith</div>
                  <div className="text-[8px] text-slate-400">B: 110% • C: 85%</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
