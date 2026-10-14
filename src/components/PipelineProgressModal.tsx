/**
 * Pipeline Progress Modal
 * Real-time stepper tracking multi-step Computer Vision & AI analysis
 * Styled in the LUNIQ Obsidian / Moon-Knight cinematic lunar aesthetic.
 */

import React from 'react';
import { CheckCircle2, Loader2, Sparkles, X, ArrowRight } from 'lucide-react';
import { AnalysisStep } from '../types.ts';

interface PipelineProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: string;
  progress: number;
  currentStep: string;
  steps: AnalysisStep[];
  onViewResults: () => void;
}

export const PipelineProgressModal: React.FC<PipelineProgressModalProps> = ({
  isOpen,
  onClose,
  status,
  progress,
  currentStep,
  steps,
  onViewResults,
}) => {
  if (!isOpen) return null;

  const isCompleted = status === 'completed';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#080a0f] border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.9)] p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-black/60 border border-white/20 flex items-center justify-center">
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Loader2 className="w-5 h-5 text-[#c5a059] animate-spin" />
              )}
            </div>
            <div>
              <h3 className="font-celestial text-sm font-bold text-white uppercase tracking-widest">
                {isCompleted ? 'ANALYSIS COMPLETED' : 'LUNIQ PIPELINE EXECUTING'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {isCompleted
                  ? 'All photogrammetry, feature matching, and multi-band reconstruction steps finished successfully.'
                  : currentStep || 'Processing multi-pass photogrammetry...'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Pipeline Execution Progress:</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/60 overflow-hidden border border-white/10">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-slate-200 via-white to-[#c5a059] transition-all duration-300 shadow-[0_0_12px_rgba(255,255,255,0.4)]"
            />
          </div>
        </div>

        {/* Pipeline Step List */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {steps.map((step) => {
            const isDone = step.status === 'completed';
            const isRunning = step.status === 'running';

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-mono border transition ${
                  isRunning
                    ? 'bg-white/10 border-white/30 text-white'
                    : isDone
                    ? 'bg-black/50 border-white/10 text-slate-300'
                    : 'bg-black/30 border-white/5 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isRunning ? (
                    <Loader2 className="w-4 h-4 text-[#c5a059] animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                  )}
                  <span className="font-medium">{step.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  {step.duration_ms && (
                    <span className="text-[10px] text-slate-500">
                      {(step.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-mono font-semibold uppercase ${
                      isDone
                        ? 'text-emerald-400'
                        : isRunning
                        ? 'text-[#c5a059]'
                        : 'text-slate-600'
                    }`}
                  >
                    {isDone ? '● COMPLETE' : isRunning ? '▲ RUNNING' : '○ PENDING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-black/60 hover:bg-white/10 text-slate-300 text-xs font-mono border border-white/15 transition"
          >
            {isCompleted ? 'Close' : 'Background Run'}
          </button>

          {isCompleted && (
            <button
              onClick={() => {
                onClose();
                onViewResults();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white hover:bg-slate-200 text-black font-bold text-xs font-mono shadow-[0_0_20px_rgba(255,255,255,0.3)] transition"
            >
              <span>INSPECT RECONSTRUCTION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
