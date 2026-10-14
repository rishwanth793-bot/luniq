/**
 * Analyze Tab Component
 * Interactive workspace for image inspection, grid partitioning, local quality telemetry,
 * illumination geometry analysis, and viewing angles.
 * Styled in the LUNIQ Obsidian / Moon-Knight cinematic lunar aesthetic.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Sun,
  Eye,
  Sliders,
  Sparkles,
  Info,
  Layers,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import { Observation, Analysis, GridCell, IlluminationAnalysis, ViewingGeometry } from '../types.ts';
import { LightAngleIndicator } from './LightAngleIndicator.tsx';

interface AnalyzeTabProps {
  observations: Observation[];
  selectedObservation: Observation | null;
  onSelectObservation: (obs: Observation) => void;
  latestAnalysis: Analysis | null;
  selectedGridCell: GridCell | null;
  onSelectGridCell: (cell: GridCell | null) => void;
  onOpenUpload: () => void;
}

export const AnalyzeTab: React.FC<AnalyzeTabProps> = ({
  observations,
  selectedObservation,
  onSelectObservation,
  latestAnalysis,
  selectedGridCell,
  onSelectGridCell,
  onOpenUpload,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const currentObs = selectedObservation || observations[0];

  const [showGrid, setShowGrid] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [brightness, setBrightness] = useState(currentObs?.brightness ?? 100);
  const [contrast, setContrast] = useState(currentObs?.contrast ?? 100);

  useEffect(() => {
    if (currentObs) {
      if (currentObs.brightness !== undefined) setBrightness(currentObs.brightness);
      if (currentObs.contrast !== undefined) setContrast(currentObs.contrast);
    }
  }, [currentObs?.id, currentObs?.brightness, currentObs?.contrast]);

  const containerRef = useRef<HTMLDivElement>(null);

  const gridCount = latestAnalysis?.configuration.grid_size || 8;

  // Find grids for current observation
  const obsGrids = latestAnalysis?.grids.filter(
    (g) => g.observation_code === currentObs?.code
  ) || [];

  // Illumination & Viewing Geometry
  const illum: IlluminationAnalysis | undefined = latestAnalysis?.illumination_analyses.find(
    (i) => i.observation_code === currentObs?.code
  );

  const viewGeo: ViewingGeometry | undefined = latestAnalysis?.viewing_geometries.find(
    (v) => v.observation_code === currentObs?.code
  );

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="space-y-6 pb-12">
      {/* Observation Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#080a0f] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-celestial text-slate-400 font-semibold uppercase tracking-widest">
            OBSERVATION:
          </span>
          <div className="flex items-center gap-2">
            {observations.map((obs) => {
              const isSelected = obs.id === currentObs?.id;
              return (
                <button
                  key={obs.id}
                  onClick={() => {
                    onSelectObservation(obs);
                    onSelectGridCell(null);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
                    isSelected
                      ? 'bg-white/15 text-white border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                      : 'bg-black/50 text-slate-300 border-white/10 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${
                    isSelected
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-slate-300 border border-white/10'
                  }`}>
                    {obs.code}
                  </span>
                  <span>{obs.name.split('—')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenUpload}
            className="text-xs font-celestial uppercase tracking-wider px-3.5 py-1.5 rounded-lg bg-[#18140e] hover:bg-[#221c13] text-[#c5a059] border border-[#c5a059]/40 transition shadow-sm"
          >
            + Add Observation
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Canvas + Inspector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Interactive Viewport */}
        <div className="lg:col-span-8 flex flex-col rounded-xl bg-[#06080c] border border-white/10 overflow-hidden shadow-2xl">
          {/* Viewport Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#080b10] border-b border-white/10 text-xs font-mono">
            <div className="flex items-center gap-4">
              <span className="text-white font-semibold font-celestial tracking-wide">{currentObs?.name}</span>
              <span className="text-slate-400">
                {currentObs?.width}x{currentObs?.height} px · {currentObs?.format}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded border transition ${
                  showGrid ? 'bg-white/15 text-white border-white/40' : 'bg-black/60 border-white/10 text-slate-400'
                }`}
                title="Toggle Grid Overlay"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`p-1.5 rounded border transition ${
                  showHeatmap ? 'bg-[#221c13] text-[#c5a059] border-[#c5a059]/50' : 'bg-black/60 border-white/10 text-slate-400'
                }`}
                title="Toggle Local Quality Heatmap"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-white/10" />

              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 rounded bg-black/60 hover:bg-white/10 border border-white/10 text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-12 text-center text-[11px] text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(3.0, z + 0.25))}
                className="p-1.5 rounded bg-black/60 hover:bg-white/10 border border-white/10 text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setZoom(1.0);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1.5 rounded bg-black/60 hover:bg-white/10 border border-white/10 text-slate-300"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative w-full aspect-square max-h-[560px] bg-[#030406] overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              }}
              className="relative w-[384px] h-[384px] shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-white/20 shrink-0"
            >
              {/* Lunar Base Image */}
              {currentObs?.data_url && (
                <img
                  src={currentObs.data_url}
                  alt={currentObs.name}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              )}

              {/* Grid Overlay */}
              {showGrid && (
                <div
                  className="absolute inset-0 grid"
                  style={{
                    gridTemplateColumns: `repeat(${gridCount}, 1fr)`,
                    gridTemplateRows: `repeat(${gridCount}, 1fr)`,
                  }}
                >
                  {obsGrids.map((cell) => {
                    const isSelected = selectedGridCell?.id === cell.id;
                    // Quality score color tint if heatmap active
                    let bgTint = 'transparent';
                    if (showHeatmap) {
                      const q = cell.quality_score;
                      if (q > 0.7) bgTint = 'rgba(197, 160, 89, 0.35)'; // gold
                      else if (q > 0.5) bgTint = 'rgba(255, 255, 255, 0.22)'; // silver
                      else if (q > 0.3) bgTint = 'rgba(180, 140, 70, 0.2)'; // muted bronze
                      else bgTint = 'rgba(150, 40, 40, 0.3)'; // shadow loss
                    }

                    return (
                      <div
                        key={cell.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectGridCell(cell);
                        }}
                        style={{ backgroundColor: bgTint }}
                        className={`relative border border-white/15 hover:border-white/60 hover:bg-white/10 cursor-pointer transition flex items-center justify-center group ${
                          isSelected ? 'border-2 border-[#c5a059] bg-[#c5a059]/25 shadow-[inset_0_0_15px_rgba(197,160,89,0.5)]' : ''
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#c5a059] shadow-[0_0_8px_#c5a059]" />
                        )}
                        <span className="text-[9px] font-mono text-white/0 group-hover:text-white/90 transition select-none">
                          {cell.row_index},{cell.column_index}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instruction tooltip */}
            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-[11px] font-mono text-slate-300 pointer-events-none backdrop-blur-md">
              Click any grid cell to inspect local quality telemetry.
            </div>
          </div>

          {/* Viewport Radiometric Adjustment Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 bg-[#080b10] border-t border-white/10 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-3">
              <Sliders className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-300">Radiometric Adjustments:</span>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <span>Brightness:</span>
                <input
                  type="range"
                  min="50"
                  max="160"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-20 accent-slate-200"
                />
                <span className="w-8 text-right text-slate-200">{brightness}%</span>
              </label>
              <label className="flex items-center gap-2">
                <span>Contrast:</span>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-20 accent-slate-200"
                />
                <span className="w-8 text-right text-slate-200">{contrast}%</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Grid Telemetry Inspector & Illumination Panels */}
        <div className="lg:col-span-4 space-y-4">
          {/* Selected Grid Cell Inspector */}
          <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#c5a059]" />
                <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest">
                  GRID CELL INSPECTOR
                </h3>
              </div>
              {selectedGridCell ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#18140e] border border-[#c5a059]/40 text-[#c5a059]">
                  [{selectedGridCell.row_index}, {selectedGridCell.column_index}]
                </span>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">NO CELL SELECTED</span>
              )}
            </div>

            {selectedGridCell ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 rounded bg-black/60 border border-white/10">
                  <span className="text-slate-400">QUALITY SCORE</span>
                  <span className="text-base font-bold text-[#c5a059]">
                    {selectedGridCell.quality_score.toFixed(3)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">SHARPNESS</span>
                    <span className="text-slate-200 font-semibold">{selectedGridCell.sharpness.toFixed(3)}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">RMS CONTRAST</span>
                    <span className="text-slate-200 font-semibold">{selectedGridCell.contrast.toFixed(3)}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">TEXTURE ENERGY</span>
                    <span className="text-slate-200 font-semibold">{selectedGridCell.texture.toFixed(3)}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">FEATURE STRENGTH</span>
                    <span className="text-slate-200 font-semibold">{selectedGridCell.feature_strength.toFixed(3)}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">SHADOW COVERAGE</span>
                    <span className="text-[#c5a059] font-semibold">
                      {(selectedGridCell.shadow_coverage * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">REPROJECTION ERR</span>
                    <span className="text-slate-200 font-semibold">
                      {selectedGridCell.reprojection_error.toFixed(2)} px
                    </span>
                  </div>
                </div>

                {selectedGridCell.selection_reason && (
                  <div className="p-2.5 rounded bg-white/5 border border-white/10 text-[11px] space-y-1">
                    <span className="text-[#c5a059] font-semibold block">SELECTION PROVENANCE:</span>
                    <p className="text-slate-300 leading-relaxed">{selectedGridCell.selection_reason}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs font-mono space-y-1">
                <Crosshair className="w-6 h-6 mx-auto text-slate-500 mb-2" />
                <p>Click on any grid block to evaluate sharpness, shadow coverage, and quality scores.</p>
              </div>
            )}
          </div>

          {/* Illumination Geometry Panel */}
          <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#c5a059]" />
                <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest">
                  SOLAR ILLUMINATION GEOMETRY
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                ● CALCULATED
              </span>
            </div>

            {/* Light Projection Angle Row */}
            <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LightAngleIndicator angle={currentObs?.light_projection_angle} size={36} />
                <div>
                  <div className="text-[10px] text-slate-400">LIGHT PROJECTION ANGLE</div>
                  <div className="font-bold text-[#c5a059]">
                    {currentObs?.light_projection_angle !== undefined && currentObs?.light_projection_angle !== null ? (
                      `${currentObs.light_projection_angle}°`
                    ) : (
                      <span className="text-slate-500 font-normal text-[11px]">LIGHT ANGLE: NOT PROVIDED</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">0°–360°</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">SUN AZIMUTH:</span>
                <span className="text-slate-200 font-bold">{currentObs?.sun_azimuth}°</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">SUN ELEVATION:</span>
                <span className="text-slate-200 font-bold">{currentObs?.sun_elevation}°</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">SOLAR INCIDENCE ANGLE:</span>
                <span className="text-slate-200 font-bold">{currentObs?.solar_incidence_angle}°</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">ILLUMINATION VECTOR (X,Y):</span>
                <span className="text-slate-200 font-semibold">
                  [{illum?.illumination_direction_x || 0.707}, {illum?.illumination_direction_y || -0.707}]
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">SHADOW DIRECTION (X,Y):</span>
                <span className="text-[#c5a059] font-semibold">
                  [{illum?.shadow_direction_x || -0.707}, {illum?.shadow_direction_y || 0.707}]
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">SHADOW COVERAGE:</span>
                <span className="text-slate-200 font-bold">
                  {illum ? `${(illum.shadow_coverage * 100).toFixed(1)}%` : '18.4%'}
                </span>
              </div>
            </div>

            {/* Scientific Vector Diagram */}
            <div className="p-3 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between text-[11px] font-mono">
              <div className="flex flex-col items-center">
                <Sun className="w-5 h-5 text-[#c5a059]" />
                <span className="text-slate-400 text-[10px] mt-1">Sun Vector</span>
              </div>
              <span className="text-slate-400 font-bold">───────►</span>
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full border border-white/30 bg-white/10 flex items-center justify-center text-[10px] text-white">
                  ☽
                </div>
                <span className="text-slate-400 text-[10px] mt-1">Regolith</span>
              </div>
              <span className="text-[#c5a059] font-bold">───────►</span>
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 bg-black border border-[#c5a059]/40 flex items-center justify-center text-[10px] text-[#c5a059]">
                  ■
                </div>
                <span className="text-slate-400 text-[10px] mt-1">Shadow</span>
              </div>
            </div>
          </div>

          {/* Viewing Geometry Panel */}
          <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-300" />
                <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest">
                  VIEWING / ACQUISITION GEOMETRY
                </h3>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                CALCULATED
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">VIEWING ANGLE:</span>
                <span className="text-slate-200 font-bold">{currentObs?.viewing_angle}°</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">EMISSION ANGLE:</span>
                <span className="text-slate-200 font-bold">{viewGeo?.emission_angle || currentObs?.viewing_angle}°</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">FRAME ROTATION:</span>
                <span className="text-slate-200 font-bold">{currentObs?.rotation}°</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">GSD SCALE:</span>
                <span className="text-slate-200 font-bold">{currentObs?.scale || 1.0}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
