/**
 * Moon 3D Tab Component
 * Interactive 3D Lunar Digital Twin and Photogrammetric Projection Sphere.
 * Features synchronized solar vector illumination, sub-polar coordinate grid,
 * realistic 3D procedural lunar surface with Three.js, crater relief, and HUD telemetry.
 */

import React, { useState } from 'react';
import {
  Globe2,
  Sun,
  Layers,
  Sparkles,
  Compass,
} from 'lucide-react';
import { Observation, Analysis } from '../types.ts';
import { Realistic3DMoon } from './Realistic3DMoon.tsx';

interface Moon3DTabProps {
  observations: Observation[];
  latestAnalysis: Analysis | null;
}

interface Landmark {
  id: string;
  name: string;
  lat: string;
  lon: string;
  diameter: string;
  elevation: string;
  type: string;
  yaw: number;
  pitch: number;
}

const LUNAR_LANDMARKS: Landmark[] = [
  {
    id: 'shackleton',
    name: 'Shackleton Rim (Mission Target)',
    lat: '89.9° S',
    lon: '0.0° E',
    diameter: '21.0 km',
    elevation: '+4,200 m',
    type: 'Permanently Shadowed Polar Crater',
    yaw: 0,
    pitch: -89,
  },
  {
    id: 'tycho',
    name: 'Tycho Crater',
    lat: '43.3° S',
    lon: '11.2° W',
    diameter: '86.0 km',
    elevation: '+4,800 m',
    type: 'Copernican-Age Impact Crater with Rays',
    yaw: 348,
    pitch: -43,
  },
  {
    id: 'copernicus',
    name: 'Copernicus Crater',
    lat: '9.6° N',
    lon: '20.1° W',
    diameter: '93.0 km',
    elevation: '+3,760 m',
    type: 'Terraced Rim & Central Peaks',
    yaw: 340,
    pitch: 10,
  },
  {
    id: 'tranquillitatis',
    name: 'Mare Tranquillitatis',
    lat: '0.7° N',
    lon: '23.5° E',
    diameter: '873 km',
    elevation: '-1,400 m',
    type: 'Basaltic Mare (Apollo 11 Statio)',
    yaw: 24,
    pitch: 1,
  },
  {
    id: 'procellarum',
    name: 'Oceanus Procellarum',
    lat: '18.4° N',
    lon: '57.4° W',
    diameter: '2,500 km',
    elevation: '-2,100 m',
    type: 'Vast Flood Basalt Basin',
    yaw: 302,
    pitch: 18,
  },
];

export const Moon3DTab: React.FC<Moon3DTabProps> = ({ observations, latestAnalysis }) => {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [selectedObsCode, setSelectedObsCode] = useState<string>(observations[0]?.code || 'A');
  const [textureMode, setTextureMode] = useState<'photometric' | 'hypsometric' | 'shadows'>('photometric');
  const [activeLandmark, setActiveLandmark] = useState<Landmark>(LUNAR_LANDMARKS[0]);
  const [targetOrientation, setTargetOrientation] = useState<{ yaw: number; pitch: number; label?: string } | null>(null);

  const activeObs = observations.find((o) => o.code === selectedObsCode) || observations[0];
  const sunAzimuth = activeObs?.sun_azimuth ?? activeObs?.light_projection_angle ?? 45;
  const sunElevation = activeObs?.sun_elevation ?? 20;

  const handleSelectLandmark = (lm: Landmark) => {
    setActiveLandmark(lm);
    setAutoRotate(false);
    setTargetOrientation({ yaw: lm.yaw, pitch: lm.pitch, label: lm.name });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 3D Viewport Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#080a0f] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <Globe2 className="w-4 h-4 text-slate-300" />
          <span className="text-xs font-celestial font-bold text-white uppercase tracking-widest">
            PHYSICAL 3D LUNAR DIGITAL TWIN & ILLUMINATION SIMULATOR
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Observation Solar Source Selector */}
          <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-lg border border-white/10">
            <span className="text-slate-400 text-[11px]">Sun Vector:</span>
            {observations.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedObsCode(o.code)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition ${
                  selectedObsCode === o.code
                    ? 'bg-white/20 text-[#c5a059]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pass {o.code}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setAutoRotate(!autoRotate);
              if (!autoRotate) setTargetOrientation(null);
            }}
            className={`px-3 py-1.5 rounded-lg border transition ${
              autoRotate
                ? 'bg-white/10 text-white border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                : 'bg-black/60 border-white/10 text-slate-400'
            }`}
          >
            {autoRotate ? 'Auto-Orbit: ON' : 'Auto-Orbit: OFF'}
          </button>

          <button
            onClick={() => setShowParticles(!showParticles)}
            className={`px-3 py-1.5 rounded-lg border transition ${
              showParticles
                ? 'bg-white/10 text-white border-white/30'
                : 'bg-black/60 border-white/10 text-slate-400'
            }`}
          >
            Floating Dust: {showParticles ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowTelemetry(!showTelemetry)}
            className={`px-3 py-1.5 rounded-lg border transition ${
              showTelemetry
                ? 'bg-[#18140e] text-[#c5a059] border-[#c5a059]/40'
                : 'bg-black/60 border-white/10 text-slate-400'
            }`}
          >
            HUD Telemetry: {showTelemetry ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Card + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-xl bg-[#050608] border border-white/10 overflow-hidden shadow-2xl relative select-none">
          <Realistic3DMoon
            size="large"
            sunAzimuth={sunAzimuth}
            sunElevation={sunElevation}
            interactive={true}
            autoRotate={autoRotate}
            showOverlayTelemetry={showTelemetry}
            showDustParticles={showParticles}
            targetOrientation={targetOrientation}
            textureMode={textureMode}
            onTextureModeChange={setTextureMode}
            className="w-full h-[540px] sm:h-[600px]"
          />
        </div>

        {/* Right 4 Cols: Telemetry & Orbit Parameters */}
        <div className="lg:col-span-4 space-y-4">
          {/* Target Coordinate Telemetry */}
          <div className="p-5 rounded-xl bg-[#080a0f] border border-white/10 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest">
                TARGET COORDINATE TELEMETRY
              </h3>
              <span className="text-[10px] font-mono text-[#c5a059]">{activeLandmark.id.toUpperCase()}</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">FEATURE:</span>
                <span className="text-white font-bold text-right">{activeLandmark.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">SELENOGRAPHIC LAT:</span>
                <span className="text-slate-200 font-bold">{activeLandmark.lat}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">SELENOGRAPHIC LON:</span>
                <span className="text-slate-200 font-bold">{activeLandmark.lon}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">DIAMETER / SPAN:</span>
                <span className="text-slate-200 font-bold">{activeLandmark.diameter}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">RELIEF ELEVATION:</span>
                <span className="text-[#c5a059] font-bold">{activeLandmark.elevation}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">GEOLOGY:</span>
                <span className="text-slate-300 text-right text-[11px] max-w-[170px] truncate">{activeLandmark.type}</span>
              </div>
            </div>
          </div>

          {/* Quick Landmark Jump Nav */}
          <div className="p-5 rounded-xl bg-[#080a0f] border border-white/10 space-y-3 shadow-md">
            <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest border-b border-white/10 pb-2 flex items-center justify-between">
              <span>LANDMARK TARGET JUMP</span>
              <Compass className="w-3.5 h-3.5 text-[#c5a059]" />
            </h3>

            <div className="space-y-1.5">
              {LUNAR_LANDMARKS.map((lm) => {
                const isSelected = activeLandmark.id === lm.id;
                return (
                  <button
                    key={lm.id}
                    onClick={() => handleSelectLandmark(lm)}
                    className={`w-full p-2.5 rounded-lg text-left text-xs font-mono transition flex items-center justify-between border ${
                      isSelected
                        ? 'bg-[#18140e] border-[#c5a059]/50 text-white shadow-sm'
                        : 'bg-black/40 border-white/5 text-slate-300 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-white text-[11px]">{lm.name}</span>
                      <span className="text-[10px] text-slate-400">{lm.lat}, {lm.lon}</span>
                    </div>
                    <span className="text-[10px] text-[#c5a059] font-mono">Orient ➔</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Synchronized Solar Illumination */}
          <div className="p-5 rounded-xl bg-[#080a0f] border border-white/10 space-y-3 shadow-md">
            <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest border-b border-white/10 pb-2">
              SOLAR INCIDENCE ANGLE (PASS {activeObs?.code})
            </h3>

            <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#c5a059]">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  <span className="font-bold">Azimuth {sunAzimuth}°</span>
                </div>
                <span className="text-white font-bold">Elevation {sunElevation}°</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Solar vector dynamically drives the directional Three.js lighting rig, simulating true terminator shadows on the digital twin.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#080a0f] border border-white/10 space-y-3 shadow-md">
            <h3 className="font-celestial text-xs font-semibold text-slate-200 uppercase tracking-widest border-b border-white/10 pb-2">
              MULTI-PASS RECONSTRUCTION
            </h3>

            <div className="space-y-2 text-xs font-mono text-slate-400">
              <div className="flex items-center justify-between">
                <span>Total Observations:</span>
                <span className="text-white font-bold">{observations.length} passes</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Reconstruction Grid:</span>
                <span className="text-white font-bold">
                  {latestAnalysis?.configuration.grid_size || 8}x{latestAnalysis?.configuration.grid_size || 8}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Quality Improvement:</span>
                <span className="text-emerald-400 font-bold">
                  +{latestAnalysis?.fusion_result?.quality_improvement || 8.5}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
