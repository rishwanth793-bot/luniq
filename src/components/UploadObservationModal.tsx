/**
 * Upload Observation Modal
 * Allows uploading custom lunar image frames with full solar and viewing metadata.
 * Styled in the LUNIQ Obsidian / Moon-Knight cinematic lunar aesthetic.
 */

import React, { useState, useRef } from 'react';
import { UploadCloud, X, Sun, Eye, AlertCircle } from 'lucide-react';
import { uploadObservation } from '../services/api.ts';
import { Observation } from '../types.ts';
import { LightAngleIndicator } from './LightAngleIndicator.tsx';

interface UploadObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  onObservationUploaded: (obs: Observation) => void;
}

export const UploadObservationModal: React.FC<UploadObservationModalProps> = ({
  isOpen,
  onClose,
  missionId,
  onObservationUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('A');
  const [lightProjectionAngle, setLightProjectionAngle] = useState<string>('');
  const [sunAzimuth, setSunAzimuth] = useState('45');
  const [sunElevation, setSunElevation] = useState('30');
  const [solarIncidence, setSolarIncidence] = useState('60');
  const [viewingAngle, setViewingAngle] = useState('2');
  const [rotation, setRotation] = useState('0');
  const [scale, setScale] = useState('1.0');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drop a lunar image file.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', name || file.name);
      formData.append('code', code.toUpperCase() || 'A');
      if (lightProjectionAngle.trim() !== '') {
        formData.append('light_projection_angle', lightProjectionAngle.trim());
        formData.append('sun_azimuth', lightProjectionAngle.trim());
      } else {
        formData.append('sun_azimuth', sunAzimuth);
      }
      formData.append('sun_elevation', sunElevation);
      formData.append('solar_incidence_angle', solarIncidence);
      formData.append('viewing_angle', viewingAngle);
      formData.append('rotation', rotation);
      formData.append('scale', scale);

      const obs = await uploadObservation(missionId, formData);
      onObservationUploaded(obs);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload observation');
    } finally {
      setIsUploading(false);
    }
  };

  const parsedAngle = lightProjectionAngle.trim() === '' ? null : parseFloat(lightProjectionAngle);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#080a0f] border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.9)] p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-5 h-5 text-[#c5a059]" />
            <h3 className="font-celestial text-sm font-bold text-white uppercase tracking-widest">
              INGEST LUNAR OBSERVATION FRAME
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* File Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/15 hover:border-[#c5a059] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-black/50 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {previewUrl ? (
              <div className="flex items-center gap-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow-md"
                />
                <div className="text-left space-y-1">
                  <span className="text-white font-bold block">{file?.name}</span>
                  <span className="text-slate-400 text-[11px] block">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                  </span>
                  <span className="text-[#c5a059] text-[11px] hover:underline">Click to change image</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <UploadCloud className="w-8 h-8 text-[#c5a059] mx-auto group-hover:scale-110 transition" />
                <p className="text-slate-300">Drag & drop lunar image here, or click to browse</p>
                <p className="text-[11px] text-slate-500">Supports PNG, JPEG, TIFF</p>
              </div>
            )}
          </div>

          {/* Identification fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-slate-400 text-[11px]">OBSERVATION NAME:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#c5a059] transition"
              />
            </div>
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px]">FRAME CODE:</label>
              <input
                type="text"
                maxLength={2}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#c5a059] text-center uppercase transition"
              />
            </div>
          </div>

          {/* Light Projection Angle */}
          <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#c5a059] text-[11px] font-bold">
                <Sun className="w-3.5 h-3.5" />
                <span>LIGHT PROJECTION ANGLE:</span>
              </div>
              <div className="font-mono text-xs font-bold">
                {parsedAngle !== null ? (
                  <span className="text-[#c5a059] px-2 py-0.5 rounded bg-[#1c160f] border border-[#c5a059]/40">
                    {parsedAngle}°
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px] px-1.5 py-0.5 rounded bg-black/50 border border-white/10">
                    LIGHT ANGLE: NOT PROVIDED
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <LightAngleIndicator angle={parsedAngle} size={42} />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="360"
                      step="1"
                      placeholder="Optional (e.g. 35)"
                      value={lightProjectionAngle}
                      onChange={(e) => setLightProjectionAngle(e.target.value)}
                      className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#c5a059] pr-6 transition"
                    />
                    <span className="absolute right-2.5 top-1 font-mono text-xs text-slate-400 pointer-events-none">
                      °
                    </span>
                  </div>
                  {lightProjectionAngle !== '' && (
                    <button
                      type="button"
                      onClick={() => setLightProjectionAngle('')}
                      className="text-[10px] font-mono text-slate-400 hover:text-[#c5a059] px-1.5 py-1 rounded bg-black/50 border border-white/10 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={parsedAngle !== null ? parsedAngle : 0}
                  onChange={(e) => setLightProjectionAngle(e.target.value)}
                  className="w-full accent-white cursor-pointer h-1.5 bg-black rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Solar Geometry Inputs */}
          <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-[#c5a059] text-[11px] font-bold">
              <Sun className="w-3.5 h-3.5" />
              <span>SOLAR ILLUMINATION ANGLES:</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block">SUN AZIMUTH (°)</label>
                <input
                  type="number"
                  value={sunAzimuth}
                  onChange={(e) => setSunAzimuth(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#c5a059] transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">SUN ELEVATION (°)</label>
                <input
                  type="number"
                  value={sunElevation}
                  onChange={(e) => setSunElevation(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#c5a059] transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">SOLAR INCIDENCE (°)</label>
                <input
                  type="number"
                  value={solarIncidence}
                  onChange={(e) => setSolarIncidence(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#c5a059] transition"
                />
              </div>
            </div>
          </div>

          {/* Viewing Geometry Inputs */}
          <div className="p-3.5 rounded-lg bg-black/60 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 text-[11px] font-bold">
              <Eye className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>CAMERA & SATELLITE GEOMETRY:</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block">VIEWING ANGLE (°)</label>
                <input
                  type="number"
                  value={viewingAngle}
                  onChange={(e) => setViewingAngle(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#c5a059] transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">ROTATION (°)</label>
                <input
                  type="number"
                  step="0.5"
                  value={rotation}
                  onChange={(e) => setRotation(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#c5a059] transition"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">SCALE RATIO</label>
                <input
                  type="number"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#c5a059] transition"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-black/60 hover:bg-white/10 text-slate-300 border border-white/15 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 rounded-lg bg-white hover:bg-slate-200 text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50 transition"
            >
              {isUploading ? 'Ingesting...' : 'Ingest Observation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
