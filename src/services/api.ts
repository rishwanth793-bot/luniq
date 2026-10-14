/**
 * LUNIQ API Client
 * Typed communication with backend REST endpoints
 */

import {
  Mission,
  Observation,
  Analysis,
  AnalysisConfiguration,
  AIInsight,
} from '../types.ts';

export async function fetchMissions(): Promise<Mission[]> {
  const res = await fetch('/api/missions');
  const data = await res.json();
  return data.missions || [];
}

export async function createMission(
  name: string,
  description: string,
  targetFeature: string
): Promise<Mission> {
  const res = await fetch('/api/missions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mission_name: name,
      description,
      target_feature: targetFeature,
    }),
  });
  const data = await res.json();
  return data.mission;
}

export async function seedDemoMission(): Promise<{ success: boolean; mission_id?: string; analysis_id?: string }> {
  const res = await fetch('/api/missions/demo-seed', { method: 'POST' });
  const data = await res.json();
  return data;
}

export async function fetchObservations(missionId: string): Promise<Observation[]> {
  const res = await fetch(`/api/missions/${missionId}/observations`);
  const data = await res.json();
  return data.observations || [];
}

export async function uploadObservation(
  missionId: string,
  formData: FormData
): Promise<Observation> {
  const res = await fetch(`/api/missions/${missionId}/observations`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to upload observation');
  }
  return data.observation;
}

export async function updateObservation(
  missionId: string,
  observationId: string,
  updates: Partial<Observation>
): Promise<Observation> {
  const res = await fetch(`/api/missions/${missionId}/observations/${observationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to update observation');
  }
  return data.observation;
}

export async function deleteObservation(
  missionId: string,
  observationId: string
): Promise<void> {
  const res = await fetch(`/api/missions/${missionId}/observations/${observationId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to delete observation');
  }
}

export async function reorderObservations(
  missionId: string,
  observationIds: string[]
): Promise<Observation[]> {
  const res = await fetch(`/api/missions/${missionId}/observations/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ observation_ids: observationIds }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to reorder observations');
  }
  return data.observations;
}

export async function fetchAnalyses(missionId?: string): Promise<Analysis[]> {
  const url = missionId ? `/api/analyses?mission_id=${missionId}` : '/api/analyses';
  const res = await fetch(url);
  const data = await res.json();
  return data.analyses || [];
}

export async function fetchAnalysis(analysisId: string): Promise<Analysis> {
  const res = await fetch(`/api/analyses/${analysisId}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to load analysis');
  }
  return data.analysis;
}

export async function createAnalysis(
  missionId: string,
  referenceObservationId: string,
  configuration?: Partial<AnalysisConfiguration>
): Promise<Analysis> {
  const res = await fetch('/api/analyses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mission_id: missionId,
      reference_observation_id: referenceObservationId,
      configuration,
    }),
  });
  const data = await res.json();
  return data.analysis;
}

export async function runAnalysis(
  analysisId: string,
  configuration?: Partial<AnalysisConfiguration>
): Promise<void> {
  await fetch(`/api/analyses/${analysisId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ configuration }),
  });
}

export async function fetchAnalysisStatus(analysisId: string): Promise<{
  status: Analysis['status'];
  progress: number;
  current_step: string;
  completed_steps: number;
  total_steps: number;
  steps: any[];
}> {
  const res = await fetch(`/api/analyses/${analysisId}/status`);
  return await res.json();
}

export async function fetchAIInsight(analysisId: string): Promise<AIInsight> {
  const res = await fetch(`/api/analyses/${analysisId}/ai-insight`, {
    method: 'POST',
  });
  const data = await res.json();
  return data.insight;
}
