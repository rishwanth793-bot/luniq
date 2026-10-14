/**
 * Persistent Database & File Storage Layer
 * Manages Missions, Observations, Analyses, and CV Artifacts
 */

import fs from 'fs';
import path from 'path';
import {
  Mission,
  Observation,
  Analysis,
  GridCell,
  IlluminationAnalysis,
  ViewingGeometry,
  FeatureResult,
  MatchResult,
  RegistrationResult,
  SourceSelection,
  FusionResult,
  ValidationResult,
  AIInsight,
} from '../src/types.ts';
import {
  renderLunarObservation,
  imageBufferToDataURL,
  pngBufferToImageData,
} from './cv/synthetic.ts';
import { ImageDataBuffer } from './cv/filters.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORAGE_DIR = path.resolve(DATA_DIR, 'storage');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

export interface DatabaseSchema {
  missions: Mission[];
  observations: Observation[];
  analyses: Analysis[];
}

let dbCache: DatabaseSchema = {
  missions: [],
  observations: [],
  analyses: [],
};

// In-memory image buffer cache for ultra-fast CV pipeline access
export const imageBufferCache = new Map<string, ImageDataBuffer>();

export function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load database file, initializing fresh:', err);
  }
  return dbCache;
}

export function saveDatabase(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database file:', err);
  }
}

export function saveImageFile(filename: string, buffer: Buffer): string {
  const filePath = path.join(STORAGE_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filename;
}

export function getImageFile(filename: string): Buffer | null {
  const filePath = path.join(STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }
  return null;
}

// Database helper functions
export const db = {
  getMissions(): Mission[] {
    return dbCache.missions;
  },
  getMission(id: string): Mission | undefined {
    return dbCache.missions.find((m) => m.id === id);
  },
  createMission(mission: Mission): Mission {
    dbCache.missions.push(mission);
    saveDatabase();
    return mission;
  },
  deleteMission(id: string): boolean {
    dbCache.missions = dbCache.missions.filter((m) => m.id !== id);
    dbCache.observations = dbCache.observations.filter((o) => o.mission_id !== id);
    dbCache.analyses = dbCache.analyses.filter((a) => a.mission_id !== id);
    saveDatabase();
    return true;
  },

  getObservations(missionId?: string): Observation[] {
    if (missionId) {
      return dbCache.observations.filter((o) => o.mission_id === missionId);
    }
    return dbCache.observations;
  },
  getObservation(id: string): Observation | undefined {
    return dbCache.observations.find((o) => o.id === id);
  },
  createObservation(obs: Observation): Observation {
    dbCache.observations.push(obs);
    saveDatabase();
    return obs;
  },
  updateObservation(id: string, updates: Partial<Observation>): Observation | null {
    const idx = dbCache.observations.findIndex((o) => o.id === id);
    if (idx === -1) return null;
    dbCache.observations[idx] = { ...dbCache.observations[idx], ...updates };
    saveDatabase();
    return dbCache.observations[idx];
  },
  deleteObservation(id: string): boolean {
    dbCache.observations = dbCache.observations.filter((o) => o.id !== id);
    imageBufferCache.delete(id);
    saveDatabase();
    return true;
  },

  getAnalyses(missionId?: string): Analysis[] {
    if (missionId) {
      return dbCache.analyses.filter((a) => a.mission_id === missionId);
    }
    return dbCache.analyses;
  },
  getAnalysis(id: string): Analysis | undefined {
    return dbCache.analyses.find((a) => a.id === id);
  },
  createAnalysis(analysis: Analysis): Analysis {
    dbCache.analyses.push(analysis);
    saveDatabase();
    return analysis;
  },
  updateAnalysis(id: string, updates: Partial<Analysis>): Analysis | null {
    const idx = dbCache.analyses.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    dbCache.analyses[idx] = { ...dbCache.analyses[idx], ...updates };
    saveDatabase();
    return dbCache.analyses[idx];
  },
};

/**
 * Seed the initial high-fidelity lunar demo mission "LUNIQ-01"
 */
export async function seedDemoMission(force = false): Promise<void> {
  loadDatabase();

  const existingMission = dbCache.missions.find((m) => m.id === 'mission_luniq_01');
  if (existingMission && !force) {
    console.log('Demo mission LUNIQ-01 already seeded.');
    return;
  }

  const missionId = 'mission_luniq_01';
  if (existingMission || force) {
    db.deleteMission(missionId);
  }

  console.log('Generating procedural lunar observations for demo mission LUNIQ-01...');
  const mission: Mission = {
    id: missionId,
    mission_name: 'LUNIQ-01: Shackleton Rim Multi-Pass',
    description:
      'Multi-pass photometric observation of Shackleton Crater south-polar rim. Combines 4 distinct acquisition angles and illumination vectors to reconstruct permanently shadowed regions and high-relief rim micro-structures.',
    status: 'active',
    target_feature: 'Shackleton Crater Rim (89.9°S, 0.0°E)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    observation_count: 4,
  };

  db.createMission(mission);

  // Specifications for the 4 Observations
  const obsSpecs = [
    {
      code: 'A',
      name: 'Pass 1042 — Dawn Solar Azimuth (45°)',
      sunAzimuth: 45,
      sunElevation: 22,
      rotation: 0,
      scale: 1.0,
      dx: 0,
      dy: 0,
      viewingAngle: 2.1,
      source: 'LROC NAC Equivalent M11283921',
      description: 'Low solar elevation emphasizing deep relief on western crater walls and terrace steps.',
    },
    {
      code: 'B',
      name: 'Pass 1088 — Mid-Morning Azimuth (135°)',
      sunAzimuth: 135,
      sunElevation: 36,
      rotation: 0.8,
      scale: 1.02,
      dx: 4,
      dy: -3,
      viewingAngle: 5.4,
      source: 'LROC NAC Equivalent M11284502',
      description: 'Optimal solar angle for central peak structures and eastern rim ejecta blankets.',
    },
    {
      code: 'C',
      name: 'Pass 1134 — Afternoon Grazing Azimuth (225°)',
      sunAzimuth: 225,
      sunElevation: 20,
      rotation: -0.6,
      scale: 0.99,
      dx: -5,
      dy: 6,
      viewingAngle: 3.8,
      source: 'LROC NAC Equivalent M11285119',
      description: 'Grazing illumination revealing micro-craters and sub-kilometer boulder fields.',
    },
    {
      code: 'D',
      name: 'Pass 1180 — High-Sun Photometric Pass (315°)',
      sunAzimuth: 315,
      sunElevation: 52,
      rotation: 0.3,
      scale: 1.01,
      dx: 2,
      dy: 3,
      viewingAngle: 1.2,
      source: 'LROC NAC Equivalent M11286088',
      description: 'High solar elevation minimizing shadows, maximizing regolith albedo and ray contrast.',
    },
  ];

  const resolution = 384; // Pristine 384x384 image matrix for real-time processing and crisp inspection

  for (const spec of obsSpecs) {
    const obsId = `obs_${missionId}_${spec.code.toLowerCase()}`;
    const imgBuffer = renderLunarObservation(
      resolution,
      resolution,
      spec.sunAzimuth,
      spec.sunElevation,
      spec.rotation,
      spec.scale,
      spec.dx,
      spec.dy
    );

    const dataUrl = imageBufferToDataURL(imgBuffer);
    imageBufferCache.set(obsId, imgBuffer);

    const obs: Observation = {
      id: obsId,
      mission_id: missionId,
      name: spec.name,
      code: spec.code,
      source: spec.source,
      filename: `observation_${spec.code.toLowerCase()}.png`,
      storage_key: `storage_${obsId}`,
      width: resolution,
      height: resolution,
      channels: 4,
      bit_depth: 8,
      format: 'PNG',
      acquisition_timestamp: new Date(Date.now() - (4 - obsSpecs.indexOf(spec)) * 86400000).toISOString(),
      latitude: -89.9,
      longitude: 0.0,
      sun_azimuth: spec.sunAzimuth,
      sun_elevation: spec.sunElevation,
      solar_incidence_angle: 90 - spec.sunElevation,
      viewing_angle: spec.viewingAngle,
      rotation: spec.rotation,
      scale: spec.scale,
      data_url: dataUrl,
      light_projection_angle: spec.sunAzimuth,
      metadata_json: {
        description: spec.description,
        orbit_number: 1040 + obsSpecs.indexOf(spec) * 46,
        subsolar_ground_speed_km_s: 1.62,
        spacecraft_altitude_km: 50.4,
        calibration_level: 'CDR-2 (Radiometrically Calibrated)',
      },
      created_at: new Date().toISOString(),
    };

    db.createObservation(obs);
  }

  console.log('Seeded 4 observations for LUNIQ-01.');
}
