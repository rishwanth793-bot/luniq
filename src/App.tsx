/**
 * LUNIQ Application Main Component
 * Multi-Observation Photogrammetric Registration, Illumination Geometry,
 * Information Scoring, and Seamless Reconstruction Workspace.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, TabType } from './components/Navbar.tsx';
import { OverviewTab } from './components/OverviewTab.tsx';
import { AnalyzeTab } from './components/AnalyzeTab.tsx';
import { RegisterTab } from './components/RegisterTab.tsx';
import { FuseTab } from './components/FuseTab.tsx';
import { ValidateTab } from './components/ValidateTab.tsx';
import { Moon3DTab } from './components/Moon3DTab.tsx';
import { PipelineProgressModal } from './components/PipelineProgressModal.tsx';
import { UploadObservationModal } from './components/UploadObservationModal.tsx';

import {
  fetchMissions,
  seedDemoMission,
  fetchObservations,
  fetchAnalyses,
  fetchAnalysis,
  createAnalysis,
  runAnalysis,
  fetchAnalysisStatus,
  uploadObservation,
  updateObservation,
  deleteObservation,
  reorderObservations,
} from './services/api.ts';

import { Mission, Observation, Analysis, GridCell, AnalysisStep } from './types.ts';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('overview');

  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);

  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<GridCell | null>(null);

  // Pipeline tracking
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState<string>('pending');
  const [currentPipelineStep, setCurrentPipelineStep] = useState<string>('');
  const [pipelineSteps, setPipelineSteps] = useState<AnalysisStep[]>([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);

  // Modals
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Load initial missions
  const loadMissionsData = useCallback(async () => {
    try {
      const ms = await fetchMissions();
      setMissions(ms);
      if (ms.length > 0) {
        const defaultMission = ms[0];
        setSelectedMission(defaultMission);
        loadMissionObservations(defaultMission.id);
        loadMissionAnalyses(defaultMission.id);
      }
    } catch (err) {
      console.error('Failed to fetch missions:', err);
    }
  }, []);

  const loadMissionObservations = async (missionId: string) => {
    try {
      const obs = await fetchObservations(missionId);
      setObservations(obs);
      if (obs.length > 0) {
        setSelectedObservation(obs[0]);
      }
    } catch (err) {
      console.error('Failed to load observations:', err);
    }
  };

  const loadMissionAnalyses = async (missionId: string) => {
    try {
      const ans = await fetchAnalyses(missionId);
      setAnalyses(ans);
      if (ans.length > 0) {
        // Find latest completed analysis
        const completed = ans.find((a) => a.status === 'completed') || ans[0];
        const full = await fetchAnalysis(completed.id);
        setLatestAnalysis(full);
      }
    } catch (err) {
      console.error('Failed to load analyses:', err);
    }
  };

  useEffect(() => {
    loadMissionsData();
  }, [loadMissionsData]);

  // Poll analysis progress if running
  useEffect(() => {
    if (!isProcessing || !activeAnalysisId) return;

    const interval = setInterval(async () => {
      try {
        const statusData = await fetchAnalysisStatus(activeAnalysisId);
        setPipelineProgress(statusData.progress);
        setPipelineStatus(statusData.status);
        setCurrentPipelineStep(statusData.current_step);
        setPipelineSteps(statusData.steps || []);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          setIsProcessing(false);
          clearInterval(interval);

          if (statusData.status === 'completed') {
            const updated = await fetchAnalysis(activeAnalysisId);
            setLatestAnalysis(updated);
            if (selectedMission) {
              const ans = await fetchAnalyses(selectedMission.id);
              setAnalyses(ans);
            }
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isProcessing, activeAnalysisId, selectedMission]);

  // Start new analysis trigger
  const handleStartAnalysis = async () => {
    if (!selectedMission || observations.length === 0) return;

    try {
      setIsProcessing(true);
      setPipelineProgress(5);
      setPipelineStatus('running');
      setCurrentPipelineStep('Initializing multi-pass lunar registration pipeline...');
      setIsProgressModalOpen(true);

      const refObs = observations.find((o) => o.code === 'A') || observations[0];
      const newAnalysis = await createAnalysis(selectedMission.id, refObs.id, {
        grid_size: 8,
        feature_method: 'SIFT',
        matching_method: 'Lowe-Ratio-SIFT',
        ransac_threshold: 2.5,
        transformation_type: 'Homography',
        illumination_normalization: true,
        fusion_method: 'Multiband-Distance-Blend',
      });

      setActiveAnalysisId(newAnalysis.id);
      await runAnalysis(newAnalysis.id);
    } catch (err) {
      console.error('Failed to start analysis:', err);
      setIsProcessing(false);
    }
  };

  // Reset to demo mission
  const handleResetDemo = async () => {
    try {
      setIsProcessing(true);
      setIsProgressModalOpen(true);
      setPipelineProgress(10);
      setPipelineStatus('running');
      setCurrentPipelineStep('Reloading Shackleton Rim 4-pass dataset and synthesizing observations...');

      const res = await seedDemoMission();
      if (res.analysis_id) {
        setActiveAnalysisId(res.analysis_id);
      }
      await loadMissionsData();
    } catch (err) {
      console.error('Failed to reset demo:', err);
      setIsProcessing(false);
      setIsProgressModalOpen(false);
    }
  };

  const handleSelectMission = (mission: Mission) => {
    setSelectedMission(mission);
    loadMissionObservations(mission.id);
    loadMissionAnalyses(mission.id);
  };

  const handleSelectAnalysis = async (analysis: Analysis) => {
    try {
      const full = await fetchAnalysis(analysis.id);
      setLatestAnalysis(full);
    } catch (err) {
      console.error('Failed to load selected analysis:', err);
    }
  };

  const handleObservationUploaded = (newObs: Observation) => {
    setObservations((prev) => [...prev, newObs]);
    setSelectedObservation(newObs);
  };

  const handleAddImages = async (files: File[]) => {
    if (!selectedMission) return;
    const remainingSlots = 7 - observations.length;
    const filesToUpload = files.slice(0, remainingSlots);
    if (filesToUpload.length === 0) return;

    const letterCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
      const nextCode = letterCodes[observations.length + i] || 'A';
      formData.append('code', nextCode);

      try {
        const uploaded = await uploadObservation(selectedMission.id, formData);
        setObservations((prev) => [...prev, uploaded]);
        if (!selectedObservation) {
          setSelectedObservation(uploaded);
        }
      } catch (err: any) {
        console.error('Failed to upload image:', err);
      }
    }
  };

  const handleRemoveObservation = async (obsId: string) => {
    if (!selectedMission) return;
    try {
      await deleteObservation(selectedMission.id, obsId);
      setObservations((prev) => {
        const remaining = prev.filter((o) => o.id !== obsId);
        const letterCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
        const resequenced = remaining.map((o, idx) => ({
          ...o,
          code: letterCodes[idx] || o.code,
        }));
        if (selectedObservation?.id === obsId) {
          setSelectedObservation(resequenced[0] || null);
        }
        return resequenced;
      });
    } catch (err: any) {
      console.error('Failed to delete observation:', err);
    }
  };

  const handleReplaceObservation = async (obsId: string, file: File) => {
    if (!selectedMission) return;
    const targetObs = observations.find((o) => o.id === obsId);
    if (!targetObs) return;

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
      formData.append('code', targetObs.code);
      if (targetObs.light_projection_angle !== undefined && targetObs.light_projection_angle !== null) {
        formData.append('light_projection_angle', String(targetObs.light_projection_angle));
      }

      await deleteObservation(selectedMission.id, obsId);
      const newObs = await uploadObservation(selectedMission.id, formData);

      setObservations((prev) => prev.map((o) => (o.id === obsId ? newObs : o)));
      if (selectedObservation?.id === obsId) {
        setSelectedObservation(newObs);
      }
    } catch (err: any) {
      console.error('Failed to replace observation:', err);
    }
  };

  const handleReorderObservations = async (newOrderIds: string[]) => {
    if (!selectedMission) return;
    const letterCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
    const obsMap = new Map<string, Observation>(observations.map((o) => [o.id, o]));
    const reordered: Observation[] = [];
    newOrderIds.forEach((id, idx) => {
      const item = obsMap.get(id);
      if (item) {
        reordered.push({
          ...item,
          code: letterCodes[idx] || item.code,
        });
      }
    });

    setObservations(reordered);
    try {
      await reorderObservations(selectedMission.id, newOrderIds);
    } catch (err: any) {
      console.error('Failed to reorder observations:', err);
    }
  };

  const handleUpdateLightAngle = async (obsId: string, angle: number | null) => {
    handleUpdateAdjustments(obsId, { light_projection_angle: angle });
  };

  const handleUpdateAdjustments = async (
    obsId: string,
    adjustments: {
      light_projection_angle?: number | null;
      brightness?: number;
      contrast?: number;
    }
  ) => {
    if (!selectedMission) return;
    setObservations((prev) =>
      prev.map((o) => {
        if (o.id !== obsId) return o;
        const next: Observation = { ...o };
        if (adjustments.light_projection_angle !== undefined) {
          next.light_projection_angle = adjustments.light_projection_angle;
          if (adjustments.light_projection_angle !== null) {
            next.sun_azimuth = adjustments.light_projection_angle;
          }
        }
        if (adjustments.brightness !== undefined) {
          next.brightness = adjustments.brightness;
        }
        if (adjustments.contrast !== undefined) {
          next.contrast = adjustments.contrast;
        }
        return next;
      })
    );

    try {
      await updateObservation(selectedMission.id, obsId, adjustments);
    } catch (err: any) {
      console.error('Failed to update observation adjustments:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col selection:bg-white/20 selection:text-white">
      {/* Top Mission Control Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        missions={missions}
        selectedMission={selectedMission}
        onSelectMission={handleSelectMission}
        latestAnalysis={latestAnalysis}
        onStartNewAnalysis={handleStartAnalysis}
        onResetDemo={handleResetDemo}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        isProcessing={isProcessing}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {currentTab === 'overview' && (
          <OverviewTab
            mission={selectedMission}
            observations={observations}
            analyses={analyses}
            latestAnalysis={latestAnalysis}
            onSelectTab={setCurrentTab}
            onStartAnalysis={handleStartAnalysis}
            onResetDemo={handleResetDemo}
            onSelectAnalysis={handleSelectAnalysis}
            onAddImages={handleAddImages}
            onRemoveObservation={handleRemoveObservation}
            onReplaceObservation={handleReplaceObservation}
            onReorderObservations={handleReorderObservations}
            onUpdateLightAngle={handleUpdateLightAngle}
            onUpdateAdjustments={handleUpdateAdjustments}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'analyze' && (
          <AnalyzeTab
            observations={observations}
            selectedObservation={selectedObservation}
            onSelectObservation={setSelectedObservation}
            latestAnalysis={latestAnalysis}
            selectedGridCell={selectedGridCell}
            onSelectGridCell={setSelectedGridCell}
            onOpenUpload={() => setIsUploadModalOpen(true)}
          />
        )}

        {currentTab === 'register' && (
          <RegisterTab observations={observations} latestAnalysis={latestAnalysis} />
        )}

        {currentTab === 'fuse' && (
          <FuseTab latestAnalysis={latestAnalysis} observations={observations} />
        )}

        {currentTab === 'validate' && (
          <ValidateTab
            latestAnalysis={latestAnalysis}
            onRefreshAnalysis={() => {
              if (latestAnalysis) handleSelectAnalysis(latestAnalysis);
            }}
          />
        )}

        {currentTab === '3d' && (
          <Moon3DTab observations={observations} latestAnalysis={latestAnalysis} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#040507] py-4 text-center text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
            <span className="font-celestial text-white tracking-wider">LUNIQ AEROSPACE PHOTOGRAMMETRY & RECONSTRUCTION</span>
          </div>
          <div>
            <span>TARGET: SHACKLETON SOUTH-POLE CRATER (89.9°S, 0.0°E) · GSD: 0.5M/PX</span>
          </div>
          <div>
            <span className="text-[#c5a059]">AUTONOMOUS PHOTOGRAMMETRIC REGISTRATION & MULTI-BAND FUSION ENGINE</span>
          </div>
        </div>
      </footer>

      {/* Pipeline Stepper Modal */}
      <PipelineProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        status={pipelineStatus}
        progress={pipelineProgress}
        currentStep={currentPipelineStep}
        steps={pipelineSteps}
        onViewResults={() => {
          setIsProgressModalOpen(false);
          setCurrentTab('fuse');
        }}
      />

      {/* Upload Observation Modal */}
      {selectedMission && (
        <UploadObservationModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          missionId={selectedMission.id}
          onObservationUploaded={handleObservationUploaded}
        />
      )}
    </div>
  );
}
