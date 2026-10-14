/**
 * Lunar Image Input Grid Component
 * Responsive grid supporting 2 to 7 progressive lunar observation images.
 * Features:
 * - Empty state showing '+ ADD LUNAR IMAGE / Upload an image from the user'
 * - Responsive layout: 2-col for 2-4 images, 3-col for 5-7 images, 1-col on mobile
 * - Maximum 7 images limit with 'MAXIMUM 7 IMAGES REACHED' banner and disabled additions
 * - Card controls: Image number, filename, resolution, replace, remove, reorder
 * - Interactive Light Projection Angle (0°–360°) with live solar directional indicator
 * - Real-time Brightness & Contrast adjustment options with instant image filter update
 * - 'Change Again' action bar with instant scientific presets and reset functionality
 */

import React, { useRef, useState } from 'react';
import {
  Plus,
  AlertCircle,
  X,
} from 'lucide-react';
import { Observation } from '../types.ts';
import { LunarImageCard } from './LunarImageCard.tsx';

interface LunarImageInputGridProps {
  observations: Observation[];
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

export const LunarImageInputGrid: React.FC<LunarImageInputGridProps> = ({
  observations,
  onAddImages,
  onRemoveObservation,
  onReplaceObservation,
  onReorderObservations,
  onUpdateLightAngle,
  onUpdateAdjustments,
  isProcessing = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const count = observations.length;
  const isMaxReached = count >= 7;

  // Grid column styling based on image count:
  // 2-4 images: 2 cols on md+ screens
  // 5-7 images: 3 cols on lg+ screens
  const getGridClasses = () => {
    if (count <= 4) {
      return 'grid grid-cols-1 md:grid-cols-2 gap-4';
    }
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  };

  const handleFiles = async (files: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage('Please select valid image files (PNG, JPEG, TIFF).');
      return;
    }

    if (count >= 7) {
      setErrorMessage('MAXIMUM 7 IMAGES REACHED');
      return;
    }

    const availableSlots = 7 - count;
    if (validFiles.length > availableSlots) {
      setErrorMessage('MAXIMUM 7 IMAGES REACHED: Only added up to 7 images.');
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    if (filesToAdd.length > 0) {
      await onAddImages(filesToAdd);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  };

  const triggerReplace = (obsId: string) => {
    setReplaceTargetId(obsId);
    if (replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && replaceTargetId) {
      onReplaceObservation(replaceTargetId, e.target.files[0]);
    }
    e.target.value = '';
    setReplaceTargetId(null);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= observations.length) return;

    const newOrder = [...observations];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    onReorderObservations(newOrder.map((o) => o.id));
  };

  const handleCardAdjustments = (
    id: string,
    adjustments: {
      light_projection_angle?: number | null;
      brightness?: number;
      contrast?: number;
    }
  ) => {
    if (onUpdateAdjustments) {
      onUpdateAdjustments(id, adjustments);
    } else if (onUpdateLightAngle && adjustments.light_projection_angle !== undefined) {
      onUpdateLightAngle(id, adjustments.light_projection_angle);
    }
  };

  return (
    <section className="space-y-4">
      {/* Hidden File Inputs for Add & Replace */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceChange}
        className="hidden"
      />

      {/* Header bar with count and status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wider">
            LUNAR OBSERVATION FRAMES ({count} / 7)
          </h2>
          <span className="text-slate-600">·</span>
          <span className="text-[11px] font-mono text-slate-400">
            {count === 0
              ? 'Minimum 2 images required'
              : count === 1
              ? 'Add 1 more image for registration'
              : count >= 2 && count < 7
              ? 'Ready for multi-pass reconstruction'
              : 'Maximum capacity reached'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isMaxReached ? (
            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>MAXIMUM 7 IMAGES REACHED</span>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-semibold transition disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Image</span>
            </button>
          )}
        </div>
      </div>

      {/* Error / Max Reached Notification Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 font-mono text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-amber-400 hover:text-amber-200 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* EMPTY STATE (Starts with ZERO images selected) */}
      {count === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
            dragActive
              ? 'border-cyan-400 bg-cyan-950/30'
              : 'border-slate-800 hover:border-cyan-500/60 bg-[#0c0f16] hover:bg-[#0f1420]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Plus className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="font-mono text-sm font-bold text-slate-100 tracking-wider uppercase">
              + ADD LUNAR IMAGE
            </div>
            <p className="text-xs font-mono text-slate-400">
              Upload an image from the user
            </p>
          </div>
          <p className="text-[11px] font-mono text-slate-400 pt-2">
            Drag & drop or click to browse • Supports 2 to 7 images (PNG, JPEG, TIFF)
          </p>
        </div>
      )}

      {/* RESPONSIVE GRID (1 to 7 images) */}
      {count > 0 && (
        <div className={getGridClasses()}>
          {observations.map((obs, idx) => (
            <LunarImageCard
              key={obs.id}
              obs={obs}
              index={idx}
              totalCount={observations.length}
              onMove={handleMove}
              onReplace={triggerReplace}
              onRemove={onRemoveObservation}
              onUpdateAdjustments={handleCardAdjustments}
              isProcessing={isProcessing}
            />
          ))}

          {/* Progressive ADD IMAGE Slot (when count < 7) */}
          {!isMaxReached && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-[#0a0d14]/60 hover:bg-[#0c101a] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[360px] space-y-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                <Plus className="w-5 h-5" />
              </div>
              <div className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider group-hover:text-cyan-300">
                + ADD LUNAR IMAGE
              </div>
              <p className="font-mono text-[11px] text-slate-400">
                Upload image {count + 1} of 7
              </p>
              <span className="text-[10px] font-mono text-slate-400 pt-1">
                Drop file here or click to browse
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
