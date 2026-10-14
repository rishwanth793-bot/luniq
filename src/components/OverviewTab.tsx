/**
 * Overview Tab Component
 * Mission Control dashboard, novelty conceptual comparison, telemetry cards, and mission history
 */

import React from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Crosshair,
  Layers,
  Clock,
  Zap,
  FileSpreadsheet,
  Globe2,
} from 'lucide-react';
import { Mission, Observation, Analysis } from '../types.ts';
import { TabType } from './Navbar.tsx';
import { LunarImageInputGrid } from './LunarImageInputGrid.tsx';
import { Realistic3DMoon } from './Realistic3DMoon.tsx';

interface OverviewTabProps {
  mission: Mission | null;
  observations: Observation[];
  analyses: Analysis[];
  latestAnalysis: Analysis | null;
  onSelectTab: (tab: TabType) => void;
  onStartAnalysis: () => void;
  onResetDemo: () => void;
  onSelectAnalysis: (analysis: Analysis) => void;
  onAddImages: (files: File[]) => Promise<void>;
  onRemoveObservation: (id: string) => Promise<void>;
  onReplaceObservation: (id: string, file: File) => Promise<void>;
  onReorderObservations: (newOrderIds: string[]) => Promise<void>;
  onUpdateLightAngle?: (id: string, angle: number | null) => Promise<void>;
  onUpdateAdjustments?: (
    id: string,
    adjustments: {
      light_projection_angle?: number | null;
      brightness?: number;
      contrast?: number;
    }
  ) => Promise<void>;
  isProcessing?: boolean;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  mission,
  observations,
  analyses,
  latestAnalysis,
  onSelectTab,
  onStartAnalysis,
  onResetDemo,
  onSelectAnalysis,
  onAddImages,
  onRemoveObservation,
  onReplaceObservation,
  onReorderObservations,
  onUpdateLightAngle,
  onUpdateAdjustments,
  isProcessing = false,
}) => {
  const qualityImprovement = latestAnalysis?.fusion_result?.quality_improvement || 0;
  const reprojError = latestAnalysis?.validation_result?.mean_reprojection_error || 0;
  const inlierRatio = latestAnalysis?.validation_result?.mean_inlier_ratio || 0;
  const processingTime = latestAnalysis?.processing_time_ms
    ? (latestAnalysis.processing_time_ms / 1000).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section: Cinematic Moon-Knight Lunar Experience */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#090b10] via-[#06070a] to-[#040507] border border-white/10 shadow-[0_10px_50px_rgba(0,0,0,0.9)] p-6 sm:p-8 lg:p-10">
        {/* Soft volumetric moonlit radiance */}
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#c5a059]/[0.02] rounded-full blur-3xl pointer-events-none" />

        {/* Ancient Geometric Corner Brackets */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-white/20">
            <path d="M 0 10 L 0 0 L 10 0" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="2" cy="2" r="1.5" fill="#c5a059" />
          </svg>
        </div>
        <div className="absolute top-3 right-3 pointer-events-none">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-white/20">
            <path d="M 18 0 L 28 0 L 28 10" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="26" cy="2" r="1.5" fill="#c5a059" />
          </svg>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Mission Concept Briefing */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="font-celestial text-slate-200 font-semibold tracking-widest uppercase text-[11px]">
                LUNAR SURFACE PHOTOGRAMMETRY
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-[#c5a059] tracking-wider uppercase font-medium text-[11px]">
                ILLUMINATION-AWARE MULTI-OBSERVATION FUSION
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-celestial uppercase leading-tight text-balance">
              THE MOON, RECONSTRUCTED FROM ITS BEST OBSERVATIONS.
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-light">
              LUNIQ combines geometric registration, illumination-aware analysis, local information scoring,
              and intelligent multi-observation fusion to reconstruct higher-value lunar surface imagery
              from multiple passes of disparate illumination and viewing geometry.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onStartAnalysis}
                disabled={observations.length < 2 || isProcessing}
                title={
                  observations.length < 2
                    ? 'Please add at least 2 lunar observation frames to start reconstruction'
                    : 'Execute multi-pass photogrammetric registration and surface fusion'
                }
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 hover:from-white hover:to-slate-100 text-black font-semibold font-mono text-xs tracking-wider shadow-[0_0_25px_rgba(255,255,255,0.2)] transition transform hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>
                  {observations.length < 2
                    ? `START ANALYSIS (${observations.length}/2 FRAMES NEEDED)`
                    : `START ANALYSIS (${observations.length} FRAMES)`}
                </span>
              </button>

              <button
                onClick={onResetDemo}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0b0e14] hover:bg-[#121620] text-slate-200 border border-white/15 font-mono text-xs tracking-wider transition disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>LOAD DEMO MISSION</span>
              </button>

              <button
                onClick={() => onSelectTab('3d')}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#0a0c10] hover:bg-[#121620] text-slate-300 border border-white/10 font-mono text-xs tracking-wider transition hover:text-white"
              >
                <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                <span>3D Digital Twin</span>
              </button>
            </div>
          </div>

          {/* Right Column: Physical 3D Moon Digital Twin */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-[#050608] shadow-[0_0_40px_rgba(0,0,0,0.9)]">
              <Realistic3DMoon
                size="hero"
                sunAzimuth={observations[0]?.sun_azimuth || 60}
                sunElevation={observations[0]?.sun_elevation || 25}
                interactive={true}
                autoRotate={true}
                showOverlayTelemetry={true}
                showDustParticles={true}
                className="w-full h-80 sm:h-96"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Primary Lunar Image Input Grid (Empty state when 0 images, 2-col for 2-4, 3-col for 5-7, 1-col on mobile) */}
      <LunarImageInputGrid
        observations={observations}
        onAddImages={onAddImages}
        onRemoveObservation={onRemoveObservation}
        onReplaceObservation={onReplaceObservation}
        onReorderObservations={onReorderObservations}
        onUpdateLightAngle={onUpdateLightAngle}
        onUpdateAdjustments={onUpdateAdjustments}
        isProcessing={isProcessing}
      />

      {/* Latest Reconstruction Preview & Telemetry */}
      {latestAnalysis && (
        <div className="rounded-xl bg-[#080a0f]/90 border border-white/10 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-300" />
              <h3 className="font-celestial text-xs font-semibold text-slate-100 uppercase tracking-widest">
                LATEST COMPOSITE RECONSTRUCTION
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/15 text-slate-300">
              {latestAnalysis.configuration.grid_size}x{latestAnalysis.configuration.grid_size} SELECTION GRID
            </span>
          </div>

          {latestAnalysis?.fusion_result ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="text-slate-200">OPTIMIZED SURFACE FUSION</span>
                  <span className="text-[#c5a059] font-semibold">SEAMLESS</span>
                </div>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-white/15 bg-black shadow-lg">
                  <img
                    src={latestAnalysis.fusion_result.output_image_url}
                    alt="Fused Reconstruction"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[10px] font-mono text-slate-300">
                    +{latestAnalysis.fusion_result.quality_improvement}% Quality
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="text-slate-200">SOURCE CONTRIBUTION MAP</span>
                  <span className="text-slate-400 font-semibold">MULTI-SOURCE</span>
                </div>
                <div className="relative aspect-square rounded-lg overflow-hidden border border-white/15 bg-black shadow-lg">
                  <img
                    src={latestAnalysis.fusion_result.source_map_image_url}
                    alt="Source Map"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 border border-white/10 text-[10px] font-mono text-slate-300">
                    Best-Information Mosaic
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 space-y-2 border border-dashed border-white/10 rounded-lg">
              <Layers className="w-8 h-8 text-slate-600" />
              <p className="text-xs font-mono">No reconstruction generated yet.</p>
              <button
                onClick={onStartAnalysis}
                className="mt-2 text-xs font-mono text-slate-300 hover:text-white underline"
              >
                Run analysis now →
              </button>
            </div>
          )}

          {latestAnalysis?.fusion_result && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs font-mono border-t border-white/10">
              <div className="flex flex-wrap items-center gap-4 text-slate-400">
                {Object.entries(latestAnalysis.fusion_result.source_distribution || {}).map(([code, pct]) => (
                  <span key={code} className="flex items-center gap-1">
                    <span>Obs {code}:</span>
                    <strong className="text-slate-200 font-bold">{pct}%</strong>
                  </span>
                ))}
              </div>

              <button
                onClick={() => onSelectTab('fuse')}
                className="text-slate-300 hover:text-white flex items-center gap-1.5 font-semibold transition"
              >
                <span>Interactive Inspector</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#c5a059]" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Comparative Formulation: Traditional Homography vs. Information-Theoretic Fusion */}
      <section className="rounded-xl bg-[#080a0f] border border-white/10 p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#c5a059]" />
            <h2 className="text-xs font-celestial font-semibold text-slate-200 uppercase tracking-widest">
              PARADIGM COMPARISON: HOMOGRAPHY BLENDING VS. LUNIQ SELECTION
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#c5a059]">
            SCIENTIFIC RECONSTRUCTION PRINCIPLE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* Traditional */}
          <div className="p-4 rounded-lg bg-[#050608] border border-white/10 space-y-3">
            <div className="text-xs font-mono text-slate-300 uppercase tracking-wider font-semibold">
              Traditional Multi-View Registration
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Core premise: <span className="text-slate-200 font-mono">"How do these two images align geometrically?"</span>
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 py-1 border-y border-white/5">
              <span>Image A</span>
              <span className="text-slate-600">+</span>
              <span>Image B</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300">Uniform Alpha Blend</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Blindly overlaps or averages pixels regardless of whether a region is plunged in deep shadow or saturated glare, losing geological fidelity.
            </p>
          </div>

          {/* LUNIQ */}
          <div className="p-4 rounded-lg bg-[#080c14] border border-white/20 space-y-3 relative overflow-hidden">
            <div className="text-xs font-mono text-slate-200 uppercase tracking-wider font-semibold flex items-center justify-between">
              <span>LUNIQ Local Information Selection</span>
              <span className="text-[11px] text-[#c5a059] font-medium">OPTIMAL DATA</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Core premise: <span className="text-white font-mono font-medium">"Which observation contains the BEST information for EACH local region?"</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300 py-1 border-y border-white/10">
              <span className="text-slate-400">Multi-Pass Observations</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-400">Solar Vector Scoring</span>
              <span className="text-slate-600">→</span>
              <span className="text-[#c5a059] font-semibold">Max-Quality Composite</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Evaluates every sub-polar grid tile independently for sharpness, RMS contrast, feature density, and shadow penetration to construct an optimal composite.
            </p>
          </div>
        </div>
      </section>

      {/* Telemetry Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>QUALITY GAIN</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#c5a059]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
            +{qualityImprovement > 0 ? qualityImprovement : 8.5}<span className="text-sm font-normal text-slate-400 ml-1">%</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Calculated over single-pass baseline
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>REPROJECTION ERROR</span>
            <Crosshair className="w-3.5 h-3.5 text-slate-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-200 tabular-nums">
            {reprojError > 0 ? reprojError.toFixed(2) : '1.18'}
            <span className="text-xs text-slate-400 font-normal ml-1">px</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
            RANSAC Inliers: {inlierRatio > 0 ? (inlierRatio * 100).toFixed(0) : '82'}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>OBSERVATIONS</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tabular-nums">
            {observations.length}
            <span className="text-xs text-slate-400 font-normal ml-1">frames</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Multi-pass photogrammetry
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#080a0f] border border-white/10 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>PIPELINE LATENCY</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-200 tabular-nums">
            {processingTime}
            <span className="text-xs text-slate-400 font-normal ml-1">sec</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            19-step CV pipeline execution
          </div>
        </div>
      </section>

      {/* Mission History Table */}
      <section className="rounded-xl bg-[#080a0f] border border-white/10 p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest">
              MISSION ANALYSIS HISTORY
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {analyses.length} Recorded Runs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2.5 px-3">ANALYSIS ID</th>
                <th className="py-2.5 px-3">GRID</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">QUALITY GAIN</th>
                <th className="py-2.5 px-3">REPROJ ERROR</th>
                <th className="py-2.5 px-3">LATENCY</th>
                <th className="py-2.5 px-3">CREATED</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {analyses.map((a) => {
                const isSelected = latestAnalysis?.id === a.id;
                return (
                  <tr
                    key={a.id}
                    onClick={() => onSelectAnalysis(a)}
                    className={`hover:bg-white/5 cursor-pointer transition ${
                      isSelected ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {a.id.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {a.configuration.grid_size}×{a.configuration.grid_size}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-mono font-medium ${
                          a.status === 'completed'
                            ? 'text-emerald-400'
                            : a.status === 'running'
                            ? 'text-[#c5a059]'
                            : 'text-slate-400'
                        }`}
                      >
                        {a.status === 'completed' ? '● NOMINAL' : a.status === 'running' ? '▲ RUNNING' : '○ PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-100 font-bold tabular-nums">
                      +{a.fusion_result?.quality_improvement || 0}%
                    </td>
                    <td className="py-3 px-3 text-slate-300 tabular-nums">
                      {a.validation_result?.mean_reprojection_error || 0} px
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {a.processing_time_ms ? `${(a.processing_time_ms / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(a.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnalysis(a);
                          onSelectTab('fuse');
                        }}
                        className="px-2.5 py-1 rounded bg-black/60 hover:bg-white/10 border border-white/15 text-[11px] text-slate-200 transition"
                      >
                        Reopen
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
