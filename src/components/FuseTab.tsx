/**
 * Fuse Tab Component
 * The Core Novelty: Best-Information Source Selection, Illumination Normalization,
 * and Seamless Multi-Observation Fusion with Split Wipe & Flicker Comparators.
 * Styled in the LUNIQ Obsidian / Moon-Knight cinematic lunar aesthetic.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Layers,
  Sliders,
  Eye,
  RefreshCw,
  Info,
  Maximize2,
  CheckCircle2,
  Zap,
  Download,
  ZoomIn,
  ZoomOut,
  Pin,
  PinOff,
} from 'lucide-react';
import { Analysis, Observation, SourceSelection } from '../types.ts';

interface FuseTabProps {
  latestAnalysis: Analysis | null;
  observations: Observation[];
}

export const FuseTab: React.FC<FuseTabProps> = ({ latestAnalysis, observations }) => {
  const [viewMode, setViewMode] = useState<'split' | 'side' | 'flicker' | 'sourcemap'>('split');
  const [splitPos, setSplitPos] = useState(50); // percentage
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [flickerState, setFlickerState] = useState<'orig' | 'fused'>('fused');
  const [isFlickering, setIsFlickering] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [hoveredCell, setHoveredCell] = useState<SourceSelection | null>(null);
  const [pinnedCell, setPinnedCell] = useState<SourceSelection | null>(null);

  const refObs = observations.find((o) => o.code === 'A') || observations[0];
  const fusion = latestAnalysis?.fusion_result;
  const selections = latestAnalysis?.source_selections || [];
  const gridCount = latestAnalysis?.configuration.grid_size || 8;
  const activeDisplayCell = pinnedCell || hoveredCell;

  // Auto-flicker loop
  useEffect(() => {
    if (!isFlickering) return;
    const interval = setInterval(() => {
      setFlickerState((s) => (s === 'orig' ? 'fused' : 'orig'));
    }, 450);
    return () => clearInterval(interval);
  }, [isFlickering]);

  const handleDownloadFused = () => {
    if (!fusion?.output_image_url) return;
    const link = document.createElement('a');
    link.href = fusion.output_image_url;
    link.download = `LUNIQ_Fused_Reconstruction_${latestAnalysis?.mission_id || 'lunar'}.png`;
    link.click();
  };

  const handleSplitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingSplit(true);
    updateSplitFromPointer(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSplitPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSplit) {
      updateSplitFromPointer(e);
    }
  };

  const handleSplitPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingSplit(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const updateSplitFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setSplitPos(Math.round(x));
  };

  const sourceColors: Record<string, { border: string; bg: string; text: string; dot: string }> = {
    A: { border: 'border-white/40', bg: 'bg-white/10', text: 'text-white', dot: 'bg-white' },
    B: { border: 'border-[#c5a059]', bg: 'bg-[#1c160f]', text: 'text-[#c5a059]', dot: 'bg-[#c5a059]' },
    C: { border: 'border-amber-400', bg: 'bg-amber-950/80', text: 'text-amber-300', dot: 'bg-amber-400' },
    D: { border: 'border-slate-300', bg: 'bg-slate-800', text: 'text-slate-200', dot: 'bg-slate-300' },
    E: { border: 'border-rose-400', bg: 'bg-rose-950/80', text: 'text-rose-300', dot: 'bg-rose-400' },
    F: { border: 'border-indigo-400', bg: 'bg-indigo-950/80', text: 'text-indigo-300', dot: 'bg-indigo-400' },
    G: { border: 'border-teal-400', bg: 'bg-teal-950/80', text: 'text-teal-300', dot: 'bg-teal-400' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Core Scientific Novelty */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-black/80 via-[#0d1017] to-black/80 border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#c5a059]" />
            <h2 className="text-xs font-celestial font-bold text-white uppercase tracking-widest">
              INTELLIGENT MULTI-OBSERVATION SEAMLESS FUSION
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            "Every local region contributes from the observation containing the strongest, least-shadowed scientific data."
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">QUALITY GAIN</span>
            <span className="text-sm font-bold text-[#c5a059] tabular-nums">+{fusion?.quality_improvement || 8.5}%</span>
          </div>
          <div className="h-7 w-px bg-white/10" />
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">SEAM SCORE</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {fusion?.seam_score || 0.042}{' '}
              <span className="text-xs font-normal text-emerald-400 ml-1">SMOOTH</span>
            </span>
          </div>
        </div>
      </div>

      {/* Comparison View Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#080a0f] border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-celestial text-slate-400 uppercase tracking-widest font-semibold mr-2">
            COMPARATOR MODE:
          </span>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              viewMode === 'split'
                ? 'bg-white/15 text-white border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-black/50 text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            Interactive Split Wipe
          </button>
          <button
            onClick={() => setViewMode('side')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              viewMode === 'side'
                ? 'bg-white/15 text-white border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-black/50 text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('sourcemap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              viewMode === 'sourcemap'
                ? 'bg-white/15 text-white border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-black/50 text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            Source Contribution Map
          </button>
          <button
            onClick={() => setViewMode('flicker')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              viewMode === 'flicker'
                ? 'bg-white/15 text-white border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.15)]'
                : 'bg-black/50 text-slate-300 border-white/10 hover:bg-white/5'
            }`}
          >
            Blink Flicker Comparator
          </button>
        </div>

        {/* Source breakdown legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300 tabular-nums">
          {fusion?.source_distribution ? (
            Object.entries(fusion.source_distribution).map(([code, pct]) => {
              const dotColor = sourceColors[code]?.dot || 'bg-slate-400';
              return (
                <div key={code} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-xs ${dotColor}`} />
                  <span>Obs {code}: <strong className="text-white font-semibold">{pct}%</strong></span>
                </div>
              );
            })
          ) : (
            observations.map((obs) => {
              const dotColor = sourceColors[obs.code]?.dot || 'bg-slate-400';
              return (
                <div key={obs.id} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-xs ${dotColor}`} />
                  <span>Obs {obs.code}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Display Stage */}
        <div className="lg:col-span-8 rounded-xl bg-[#06080c] border border-white/10 overflow-hidden flex flex-col shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#080b10] border-b border-white/10 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <span className="font-celestial text-slate-400">ACTIVE VIEW:</span>
              <span className="text-white uppercase font-bold">{viewMode}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {viewMode === 'split' && (
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-[11px] text-slate-400">Wipe:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={splitPos}
                    onChange={(e) => setSplitPos(Number(e.target.value))}
                    className="w-24 accent-slate-200"
                  />
                  <span className="w-7 text-right text-white font-bold text-[11px]">{splitPos}%</span>
                </div>
              )}

              {viewMode === 'flicker' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFlickering(!isFlickering)}
                    className={`px-2.5 py-1 rounded text-xs font-mono border transition ${
                      isFlickering
                        ? 'bg-[#1c160f] text-[#c5a059] border-[#c5a059]/40 font-bold'
                        : 'bg-black/60 text-slate-300 border-white/10'
                    }`}
                  >
                    {isFlickering ? 'Pause Strobe' : 'Auto 2Hz Strobe'}
                  </button>
                  <button
                    onClick={() => setFlickerState((s) => (s === 'orig' ? 'fused' : 'orig'))}
                    className="px-2 py-1 rounded bg-black/60 border border-white/10 text-slate-300 text-xs"
                  >
                    Frame: {flickerState.toUpperCase()}
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-white/10 text-slate-300">
                <button
                  onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                  className="p-1 rounded hover:bg-white/10 text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-[10px] text-slate-200">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                  className="p-1 rounded hover:bg-white/10 text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom(1.0)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Export Fused Composite */}
              {fusion?.output_image_url && (
                <button
                  onClick={handleDownloadFused}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#18140e] hover:bg-[#221c13] text-[#c5a059] border border-[#c5a059]/40 transition text-xs font-mono font-medium shadow-sm"
                  title="Download reconstructed composite"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Center Canvas */}
          <div className="relative w-full aspect-square max-h-[580px] bg-[#030406] flex items-center justify-center p-4 select-none overflow-hidden">
            <div
              style={{
                transform: `scale(${zoom})`,
                transition: isDraggingSplit ? 'none' : 'transform 0.15s ease-out',
              }}
              className="relative shrink-0"
            >
              {viewMode === 'split' && (
                <div
                  onPointerDown={handleSplitPointerDown}
                  onPointerMove={handleSplitPointerMove}
                  onPointerUp={handleSplitPointerUp}
                  onPointerCancel={handleSplitPointerUp}
                  className="relative w-[384px] h-[384px] shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-white/20 overflow-hidden cursor-ew-resize touch-none select-none"
                >
                  {/* Underneath: Fused Reconstruction */}
                  {fusion?.output_image_url && (
                    <img
                      src={fusion.output_image_url}
                      alt="Fused"
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />
                  )}

                  {/* Overlaid: Original Reference clipped to splitPos */}
                  {refObs?.data_url && (
                    <div
                      style={{ width: `${splitPos}%` }}
                      className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.6)] z-10 pointer-events-none"
                    >
                      <img
                        src={refObs.data_url}
                        alt="Original"
                        className="absolute inset-0 w-[384px] h-[384px] max-w-none object-cover pointer-events-none"
                        draggable={false}
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/90 text-slate-200 text-[10px] font-mono border border-white/20">
                        ORIGINAL (OBS {refObs.code})
                      </span>
                    </div>
                  )}

                  {/* Tactile Drag Handle on Divider Line */}
                  <div
                    style={{ left: `${splitPos}%` }}
                    className="absolute inset-y-0 -ml-3 w-6 z-20 flex items-center justify-center pointer-events-none"
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center shadow-2xl border border-black/20 ${
                        isDraggingSplit ? 'scale-115 shadow-[0_0_15px_#fff]' : ''
                      } transition-transform`}
                    >
                      ⟷
                    </div>
                  </div>

                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#18140e] text-[#c5a059] text-[10px] font-mono border border-[#c5a059]/40 z-0 pointer-events-none">
                    OPTIMIZED LUNIQ FUSION
                  </span>
                </div>
              )}

              {viewMode === 'side' && (
                <div className="grid grid-cols-2 gap-4 w-full max-w-[560px]">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-slate-400 block text-center">
                      Original Baseline (Obs {refObs?.code || 'A'})
                    </span>
                    <div className="w-[188px] h-[188px] rounded border border-white/10 overflow-hidden bg-black">
                      <img src={refObs?.data_url} alt="Original" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-white block text-center font-bold font-celestial tracking-wider">
                      LUNIQ Reconstructed Surface
                    </span>
                    <div className="w-[188px] h-[188px] rounded border border-white/30 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.15)] bg-black">
                      <img src={fusion?.output_image_url} alt="Fused" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'sourcemap' && (
                <div className="relative w-[384px] h-[384px] shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-white/20">
                  {fusion?.source_map_image_url && (
                    <img
                      src={fusion.source_map_image_url}
                      alt="Source Map"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Grid hover and click layer */}
                  <div
                    className="absolute inset-0 grid"
                    style={{
                      gridTemplateColumns: `repeat(${gridCount}, 1fr)`,
                      gridTemplateRows: `repeat(${gridCount}, 1fr)`,
                    }}
                  >
                    {selections.map((sel) => {
                      const isPinned = pinnedCell?.grid_id === sel.grid_id;
                      const isHovered = hoveredCell?.grid_id === sel.grid_id;
                      return (
                        <div
                          key={sel.grid_id}
                          onMouseEnter={() => setHoveredCell(sel)}
                          onClick={() => setPinnedCell(isPinned ? null : sel)}
                          className={`border cursor-pointer transition flex items-center justify-center relative ${
                            isPinned
                              ? 'border-2 border-[#c5a059] bg-[#c5a059]/30 shadow-[inset_0_0_12px_rgba(197,160,89,0.5)] z-10'
                              : isHovered
                              ? 'border-white bg-white/20'
                              : 'border-white/10 hover:border-white/60 hover:bg-white/10'
                          }`}
                        >
                          {isPinned && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                          )}
                          <span className="text-[10px] font-mono font-bold text-white drop-shadow">
                            {sel.selected_code}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {viewMode === 'flicker' && (
                <div className="relative w-[384px] h-[384px] shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-white/20">
                  <img
                    src={flickerState === 'orig' ? refObs?.data_url : fusion?.output_image_url}
                    alt="Flicker"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded bg-black/90 text-xs font-mono font-bold border border-white/20">
                    FRAME: {flickerState === 'orig' ? `PASS ${refObs?.code || 'A'}` : 'LUNIQ OPTIMIZED'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-2.5 bg-[#080b10] border-t border-white/10 text-[11px] font-mono text-slate-400 flex flex-wrap justify-between gap-2">
            <span>
              {viewMode === 'split' ? 'Drag directly across the surface to compare baseline vs composite.' : 'Click any grid cell in the Source Contribution Map to pin provenance analysis.'}
            </span>
            <span className="text-[#c5a059]">Radiometrically Normalized & Feather-Blended</span>
          </div>
        </div>

        {/* Right 4 Cols: Grid Source Provenance Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-xl bg-[#080a0f] border border-white/10 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#c5a059]" />
                <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest">
                  SOURCE SELECTION PROVENANCE
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {pinnedCell && (
                  <button
                    onClick={() => setPinnedCell(null)}
                    className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
                    title="Unpin cell"
                  >
                    <PinOff className="w-3 h-3 text-[#c5a059]" />
                    <span>Unpin</span>
                  </button>
                )}
                {activeDisplayCell && (
                  <span className="text-[11px] font-mono text-white font-bold">
                    [{activeDisplayCell.row_index}, {activeDisplayCell.column_index}]
                  </span>
                )}
              </div>
            </div>

            {activeDisplayCell ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-black/60 border border-white/10 flex items-center justify-between">
                  <span className="text-slate-400">SELECTED SOURCE</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                        sourceColors[activeDisplayCell.selected_code as keyof typeof sourceColors]?.bg || 'bg-white/10'
                      } ${
                        sourceColors[activeDisplayCell.selected_code as keyof typeof sourceColors]?.text || 'text-white'
                      } border ${
                        sourceColors[activeDisplayCell.selected_code as keyof typeof sourceColors]?.border || 'border-white/20'
                      }`}
                    >
                      {activeDisplayCell.selected_code}
                    </span>
                    <span className="font-semibold text-white">
                      Observation {activeDisplayCell.selected_code}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                  <span className="text-[#c5a059] font-bold text-[11px] block">WHY SELECTED:</span>
                  <p className="text-slate-200 text-xs leading-relaxed">{activeDisplayCell.selection_reason}</p>
                </div>

                {/* Candidate alternatives breakdown */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">
                    All Candidate Scores for Cell [{activeDisplayCell.row_index}, {activeDisplayCell.column_index}]:
                  </span>
                  <div className="space-y-1">
                    {activeDisplayCell.alternatives.map((alt) => (
                      <div
                        key={alt.code}
                        className={`p-2 rounded flex items-center justify-between text-[11px] ${
                          alt.code === activeDisplayCell.selected_code
                            ? 'bg-black border border-[#c5a059]/40 text-[#c5a059] font-bold'
                            : 'bg-black/40 text-slate-400 border border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded bg-white/10 text-center font-mono">
                            {alt.code}
                          </span>
                          <span>Score: {alt.score.toFixed(3)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>Sharp: {alt.sharpness.toFixed(2)}</span>
                          <span>Shadow: {(alt.shadow_coverage * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-mono space-y-2">
                <Layers className="w-7 h-7 mx-auto text-slate-600 mb-2" />
                <p>Hover or click any tile in the Source Contribution Map to pin and inspect why that observation was selected.</p>
              </div>
            )}
          </div>

          {/* Illumination Normalization Info Box */}
          <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-2 text-xs font-mono shadow-md">
            <span className="text-slate-300 font-semibold block uppercase">
              RADIOMETRIC GAIN/OFFSET NORMALIZATION
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Before composite blending, local gain ($\gamma$) and DC bias ($\beta$) are matched against the
              reference frame to harmonize contrasting incident solar angles without destroying geological regolith albedo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
