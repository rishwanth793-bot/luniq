/**
 * Navigation Bar Component
 * Mission Control header with tab switching, mission status, and quick actions
 */

import React from 'react';
import {
  Compass,
  Layers,
  Sparkles,
  CheckCircle2,
  Globe2,
  Activity,
  Play,
  RotateCcw,
  UploadCloud,
  ChevronRight,
} from 'lucide-react';
import { Mission, Analysis } from '../types.ts';

export type TabType = 'overview' | 'analyze' | 'register' | 'fuse' | 'validate' | '3d';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  missions: Mission[];
  selectedMission: Mission | null;
  onSelectMission: (mission: Mission) => void;
  latestAnalysis: Analysis | null;
  onStartNewAnalysis: () => void;
  onResetDemo: () => void;
  onOpenUpload: () => void;
  isProcessing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  missions,
  selectedMission,
  onSelectMission,
  latestAnalysis,
  onStartNewAnalysis,
  onResetDemo,
  onOpenUpload,
  isProcessing,
}) => {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'OVERVIEW', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'analyze', label: 'ANALYZE', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'register', label: 'REGISTER', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'fuse', label: 'FUSE', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'validate', label: 'VALIDATE', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: '3d', label: '3D VIEW', icon: <Globe2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#050608]/90 backdrop-blur-md border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Left: Brand & Mission Target */}
        <div className="flex items-center gap-6">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onSelectTab('overview')}
            title="LUNIQ Mission Control"
          >
            {/* Geometric Crescent & Celestial Ring Emblem */}
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-[#0a0c10] border border-white/15 shadow-[0_0_20px_rgba(248,250,252,0.08)] group-hover:border-white/35 transition">
              <svg className="w-6 h-6" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" stroke="rgba(226, 232, 240, 0.25)" strokeWidth="1" strokeDasharray="3 2" />
                <path
                  d="M17 5 A 11 11 0 1 0 27 21 A 12 12 0 1 1 17 5 Z"
                  fill="url(#crescentGrad)"
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth="0.5"
                />
                <circle cx="21" cy="9" r="1.5" fill="#c5a059" />
                <defs>
                  <linearGradient id="crescentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="60%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <span className="font-celestial text-base font-bold text-white tracking-[0.25em] whitespace-nowrap block drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                LUNIQ
              </span>
              <p className="text-[10px] font-mono text-slate-400 tracking-wider whitespace-nowrap hidden sm:block">
                LUNAR RECONSTRUCTION PLATFORM
              </p>
            </div>
          </div>

          {/* Mission Selector */}
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-white/10">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest whitespace-nowrap">Sector:</span>
            <select
              value={selectedMission?.id || ''}
              onChange={(e) => {
                const found = missions.find((m) => m.id === e.target.value);
                if (found) onSelectMission(found);
              }}
              className="bg-[#090b10] text-xs font-mono text-slate-200 border border-white/15 rounded px-2.5 py-1 focus:outline-none focus:border-[#c5a059] transition max-w-[200px] truncate"
            >
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.mission_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#090b10]/90 p-1 rounded-lg border border-white/10 backdrop-blur-md">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/25 shadow-[0_0_15px_rgba(255,255,255,0.08)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span className="tracking-wider">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Scientific instrument status indicator */}
          {isProcessing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#18140e] border border-[#c5a059]/40 text-[#c5a059] text-xs font-mono animate-pulse whitespace-nowrap">
              <span>▲ ALIGNING</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b0f15] border border-white/10 text-emerald-400 text-[11px] font-mono whitespace-nowrap">
              <span>● NOMINAL</span>
            </div>
          )}

          <button
            onClick={onOpenUpload}
            title="Upload new lunar observation"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0b0e14] hover:bg-[#121620] text-slate-300 text-xs font-mono border border-white/15 transition hover:border-white/30 whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
            <span>Upload</span>
          </button>

          <button
            onClick={onResetDemo}
            title="Reload high-fidelity Shackleton demo mission"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0b0e14] hover:bg-[#121620] text-slate-300 text-xs font-mono border border-white/15 transition hover:border-white/30 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Demo Mission</span>
          </button>

          <button
            onClick={onStartNewAnalysis}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-gradient-to-b from-slate-100 to-slate-300 hover:from-white hover:to-slate-200 text-black font-semibold text-xs font-mono shadow-[0_0_20px_rgba(255,255,255,0.2)] transition disabled:opacity-40 cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span className="tracking-wider font-bold">START ANALYSIS</span>
          </button>
        </div>
      </div>
    </header>
  );
};
