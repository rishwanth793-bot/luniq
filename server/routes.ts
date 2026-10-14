/**
 * LUNIQ REST API Routes
 * Complete endpoints for Missions, Observations, Analyses, Pipeline Execution,
 * Results, AI Insights, and Image Files.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db, seedDemoMission, getImageFile, saveImageFile, imageBufferCache } from './db.ts';
import { executePipeline, initializeAnalysisSteps } from './pipeline.ts';
import { generateAIAnalysisInsight } from './ai.ts';
import { Mission, Observation, Analysis, AnalysisConfiguration } from '../src/types.ts';
import { pngBufferToImageData, imageBufferToDataURL } from './cv/synthetic.ts';

const upload = multer({
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  storage: multer.memoryStorage(),
});

export const apiRouter = Router();

// ==========================================
// MISSIONS
// ==========================================

apiRouter.get('/missions', (req: Request, res: Response) => {
  const missions = db.getMissions();
  const obs = db.getObservations();
  const enriched = missions.map((m) => ({
    ...m,
    observation_count: obs.filter((o) => o.mission_id === m.id).length,
  }));
  res.json({ success: true, missions: enriched });
});

apiRouter.post('/missions', (req: Request, res: Response) => {
  const { mission_name, description, target_feature } = req.body;
  if (!mission_name) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'mission_name is required' } });
  }

  const mission: Mission = {
    id: `mission_${Date.now()}`,
    mission_name,
    description: description || '',
    target_feature: target_feature || 'Lunar Surface Target',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    observation_count: 0,
  };

  db.createMission(mission);
  res.status(201).json({ success: true, mission });
});

apiRouter.get('/missions/:id', (req: Request, res: Response) => {
  const mission = db.getMission(req.params.id);
  if (!mission) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mission not found' } });
  }
  const observations = db.getObservations(mission.id);
  const analyses = db.getAnalyses(mission.id);
  res.json({ success: true, mission: { ...mission, observation_count: observations.length }, observations, analyses });
});

apiRouter.delete('/missions/:id', (req: Request, res: Response) => {
  const success = db.deleteMission(req.params.id);
  res.json({ success });
});

apiRouter.post('/missions/demo-seed', async (req: Request, res: Response) => {
  try {
    await seedDemoMission(true);
    // Automatically run demo analysis so user has immediate results to explore
    const missions = db.getMissions();
    const demoMission = missions.find((m) => m.id === 'mission_luniq_01');
    if (demoMission) {
      const existingAnalyses = db.getAnalyses(demoMission.id);
      let analysisId = existingAnalyses[0]?.id;

      if (!analysisId) {
        const obs = db.getObservations(demoMission.id);
        const ref = obs.find((o) => o.code === 'A') || obs[0];

        const analysis: Analysis = {
          id: `analysis_${Date.now()}`,
          mission_id: demoMission.id,
          status: 'pending',
          reference_observation_id: ref.id,
          created_at: new Date().toISOString(),
          configuration: {
            grid_size: 8,
            feature_method: 'SIFT',
            matching_method: 'Lowe-Ratio-SIFT',
            ransac_threshold: 3.2,
            transformation_type: 'Homography',
            quality_weights: {
              sharpness: 0.25,
              contrast: 0.2,
              texture: 0.15,
              feature_strength: 0.15,
              illumination: 0.15,
              registration: 0.1,
              shadow_penalty: 0.2,
              reprojection_penalty: 0.1,
            },
            illumination_normalization: true,
            fusion_method: 'Multiband-Distance-Blend',
          },
          steps: [],
          grids: [],
          illumination_analyses: [],
          viewing_geometries: [],
          feature_results: [],
          match_results: [],
          registration_results: [],
          source_selections: [],
        };
        analysis.steps = initializeAnalysisSteps(analysis.id);
        db.createAnalysis(analysis);
        analysisId = analysis.id;
      }

      // Execute in background
      executePipeline(analysisId)
        .then((completed) => generateAIAnalysisInsight(completed))
        .then((insight) => db.updateAnalysis(analysisId, { ai_insight: insight }))
        .catch((err) => console.error('Demo auto-run error:', err));
    }

    res.json({ success: true, message: 'Demo mission LUNIQ-01 loaded and queued for processing.' });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'DEMO_SEED_ERROR', message: err.message } });
  }
});

// ==========================================
// OBSERVATIONS
// ==========================================

apiRouter.get('/missions/:mission_id/observations', (req: Request, res: Response) => {
  const observations = db.getObservations(req.params.mission_id);
  res.json({ success: true, observations });
});

apiRouter.post(
  '/missions/:mission_id/observations',
  upload.single('image') as any,
  async (req: Request, res: Response) => {
    try {
      const mission = db.getMission(req.params.mission_id);
      if (!mission) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Mission not found' } });
      }

      let fileBuffer: Buffer;
      let filename = 'uploaded_image.png';

      if (req.file) {
        fileBuffer = req.file.buffer;
        filename = req.file.originalname;
      } else if (req.body.image_base64) {
        const base64Str = req.body.image_base64.replace(/^data:image\/\w+;base64,/, '');
        fileBuffer = Buffer.from(base64Str, 'base64');
      } else {
        return res.status(400).json({
          error: { code: 'NO_IMAGE', message: 'Please provide an image file or image_base64' },
        });
      }

      // Decode image dimensions using pngjs
      const imgBuffer = pngBufferToImageData(fileBuffer);
      const dataUrl = imageBufferToDataURL(imgBuffer);

      const existing = db.getObservations(mission.id);
      if (existing.length >= 7) {
        return res.status(400).json({
          error: { code: 'MAX_IMAGES_REACHED', message: 'MAXIMUM 7 IMAGES REACHED' },
        });
      }

      const codeOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const nextCode = codeOptions[existing.length % codeOptions.length];

      const obsId = `obs_${mission.id}_${Date.now()}`;
      imageBufferCache.set(obsId, imgBuffer);

      // Light Projection Angle (0°–360° or null if not provided)
      const rawLightAngle = req.body.light_projection_angle;
      const lightAngle =
        rawLightAngle !== undefined && rawLightAngle !== '' && rawLightAngle !== null
          ? Math.min(360, Math.max(0, parseFloat(rawLightAngle)))
          : null;

      const obs: Observation = {
        id: obsId,
        mission_id: mission.id,
        name: req.body.name || `Observation ${nextCode} (${filename})`,
        code: nextCode,
        source: req.body.source || 'User Upload',
        filename,
        storage_key: `storage_${obsId}`,
        width: imgBuffer.width,
        height: imgBuffer.height,
        channels: 4,
        bit_depth: 8,
        format: 'PNG',
        acquisition_timestamp: req.body.acquisition_timestamp || new Date().toISOString(),
        latitude: parseFloat(req.body.latitude || '-89.9'),
        longitude: parseFloat(req.body.longitude || '0.0'),
        sun_azimuth: lightAngle !== null ? lightAngle : parseFloat(req.body.sun_azimuth || '45.0'),
        sun_elevation: parseFloat(req.body.sun_elevation || '30.0'),
        solar_incidence_angle: 90 - parseFloat(req.body.sun_elevation || '30.0'),
        viewing_angle: parseFloat(req.body.viewing_angle || '2.0'),
        rotation: parseFloat(req.body.rotation || '0.0'),
        scale: parseFloat(req.body.scale || '1.0'),
        data_url: dataUrl,
        light_projection_angle: lightAngle,
        brightness: req.body.brightness ? Math.min(200, Math.max(20, parseFloat(req.body.brightness))) : 100,
        contrast: req.body.contrast ? Math.min(250, Math.max(20, parseFloat(req.body.contrast))) : 100,
        metadata_json: {
          file_size_bytes: fileBuffer.length,
          provenance: 'USER_UPLOAD',
          lightProjectionAngle: lightAngle,
          notes: req.body.notes || 'Uploaded via LUNIQ web workspace',
        },
        created_at: new Date().toISOString(),
      };

      db.createObservation(obs);
      res.status(201).json({ success: true, observation: obs });
    } catch (err: any) {
      console.error('Observation upload failed:', err);
      res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: err.message } });
    }
  }
);

apiRouter.patch('/missions/:mission_id/observations/:id', (req: Request, res: Response) => {
  const { light_projection_angle, name, code, filename } = req.body;
  const updates: Partial<Observation> = {};

  if (light_projection_angle !== undefined) {
    const parsedAngle =
      light_projection_angle === null || light_projection_angle === ''
        ? null
        : Math.min(360, Math.max(0, parseFloat(light_projection_angle)));
    updates.light_projection_angle = parsedAngle;
    if (parsedAngle !== null && !isNaN(parsedAngle)) {
      updates.sun_azimuth = parsedAngle;
    }
  }
  if (req.body.brightness !== undefined) {
    updates.brightness = Math.min(200, Math.max(20, parseFloat(req.body.brightness)));
  }
  if (req.body.contrast !== undefined) {
    updates.contrast = Math.min(250, Math.max(20, parseFloat(req.body.contrast)));
  }
  if (name !== undefined) updates.name = name;
  if (code !== undefined) updates.code = code;
  if (filename !== undefined) updates.filename = filename;

  const updated = db.updateObservation(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Observation not found' } });
  }
  res.json({ success: true, observation: updated });
});

apiRouter.delete('/missions/:mission_id/observations/:id', (req: Request, res: Response) => {
  const success = db.deleteObservation(req.params.id);
  res.json({ success });
});

apiRouter.post('/missions/:mission_id/observations/reorder', (req: Request, res: Response) => {
  const { observation_ids } = req.body as { observation_ids: string[] };
  if (!Array.isArray(observation_ids)) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'observation_ids array is required' } });
  }

  const codeOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  observation_ids.forEach((id, idx) => {
    db.updateObservation(id, {
      code: codeOptions[idx % codeOptions.length],
    });
  });

  const updatedObs = db.getObservations(req.params.mission_id);
  res.json({ success: true, observations: updatedObs });
});

apiRouter.get('/observations/:id', (req: Request, res: Response) => {
  const obs = db.getObservation(req.params.id);
  if (!obs) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Observation not found' } });
  }
  res.json({ success: true, observation: obs });
});

// ==========================================
// ANALYSES
// ==========================================

apiRouter.get('/analyses', (req: Request, res: Response) => {
  const missionId = req.query.mission_id as string;
  const analyses = db.getAnalyses(missionId);
  res.json({ success: true, analyses });
});

apiRouter.post('/analyses', (req: Request, res: Response) => {
  const { mission_id, reference_observation_id, configuration } = req.body;
  if (!mission_id) {
    return res.status(400).json({ error: { code: 'MISSING_PARAM', message: 'mission_id is required' } });
  }

  const observations = db.getObservations(mission_id);
  if (observations.length === 0) {
    return res.status(400).json({ error: { code: 'NO_OBSERVATIONS', message: 'Mission has no observations' } });
  }

  const refId = reference_observation_id || observations[0].id;
  const analysisId = `analysis_${Date.now()}`;

  const defaultConf: AnalysisConfiguration = {
    grid_size: 8,
    feature_method: 'SIFT',
    matching_method: 'Lowe-Ratio-SIFT',
    ransac_threshold: 3.2,
    transformation_type: 'Homography',
    quality_weights: {
      sharpness: 0.25,
      contrast: 0.2,
      texture: 0.15,
      feature_strength: 0.15,
      illumination: 0.15,
      registration: 0.1,
      shadow_penalty: 0.2,
      reprojection_penalty: 0.1,
    },
    illumination_normalization: true,
    fusion_method: 'Multiband-Distance-Blend',
  };

  const analysis: Analysis = {
    id: analysisId,
    mission_id,
    status: 'pending',
    reference_observation_id: refId,
    created_at: new Date().toISOString(),
    configuration: { ...defaultConf, ...(configuration || {}) },
    steps: initializeAnalysisSteps(analysisId),
    grids: [],
    illumination_analyses: [],
    viewing_geometries: [],
    feature_results: [],
    match_results: [],
    registration_results: [],
    source_selections: [],
  };

  db.createAnalysis(analysis);
  res.status(201).json({ success: true, analysis });
});

apiRouter.get('/analyses/:id', (req: Request, res: Response) => {
  const analysis = db.getAnalysis(req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analysis not found' } });
  }
  res.json({ success: true, analysis });
});

apiRouter.get('/analyses/:id/status', (req: Request, res: Response) => {
  const analysis = db.getAnalysis(req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analysis not found' } });
  }

  const completedSteps = analysis.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = analysis.steps.length || 1;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const currentStep = analysis.steps.find((s) => s.status === 'running') || analysis.steps.find((s) => s.status === 'pending');

  res.json({
    success: true,
    status: analysis.status,
    progress: progressPercent,
    current_step: currentStep ? currentStep.display_name : 'Finished',
    completed_steps: completedSteps,
    total_steps: totalSteps,
    steps: analysis.steps,
    processing_time_ms: analysis.processing_time_ms,
  });
});

apiRouter.post('/analyses/:id/run', async (req: Request, res: Response) => {
  const analysis = db.getAnalysis(req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analysis not found' } });
  }

  // Update configuration if sent with run
  if (req.body.configuration) {
    analysis.configuration = { ...analysis.configuration, ...req.body.configuration };
    db.updateAnalysis(analysis.id, { configuration: analysis.configuration });
  }

  // Execute asynchronously
  executePipeline(analysis.id)
    .then((completed) => generateAIAnalysisInsight(completed))
    .then((insight) => db.updateAnalysis(analysis.id, { ai_insight: insight }))
    .catch((err) => {
      console.error('Pipeline execution failed:', err);
      db.updateAnalysis(analysis.id, {
        status: 'failed',
        error_message: err.message,
      });
    });

  res.json({
    success: true,
    message: 'LUNIQ computer vision pipeline execution started',
    analysis_id: analysis.id,
  });
});

apiRouter.post('/analyses/:id/cancel', (req: Request, res: Response) => {
  const analysis = db.getAnalysis(req.params.id);
  if (!analysis) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Analysis not found' } });
  }
  db.updateAnalysis(analysis.id, { status: 'cancelled' });
  res.json({ success: true, message: 'Analysis cancelled' });
});

// ==========================================
// RESULTS & ARTIFACTS
// ==========================================

apiRouter.get('/analyses/:id/illumination', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, illumination: a.illumination_analyses });
});

apiRouter.get('/analyses/:id/viewing-geometry', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, viewing_geometry: a.viewing_geometries });
});

apiRouter.get('/analyses/:id/features', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, features: a.feature_results });
});

apiRouter.get('/analyses/:id/matches', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, matches: a.match_results });
});

apiRouter.get('/analyses/:id/registration', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, registration: a.registration_results });
});

apiRouter.get('/analyses/:id/grids', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, grids: a.grids });
});

apiRouter.get('/analyses/:id/selection', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, selections: a.source_selections });
});

apiRouter.get('/analyses/:id/fusion', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, fusion: a.fusion_result });
});

apiRouter.get('/analyses/:id/validation', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, validation: a.validation_result });
});

apiRouter.post('/analyses/:id/ai-insight', async (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  try {
    const insight = await generateAIAnalysisInsight(a);
    db.updateAnalysis(a.id, { ai_insight: insight });
    res.json({ success: true, insight });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'AI_ERROR', message: err.message } });
  }
});

apiRouter.get('/analyses/:id/output', (req: Request, res: Response) => {
  const a = db.getAnalysis(req.params.id);
  if (!a || !a.fusion_result) return res.status(404).json({ error: 'No output image available' });
  res.json({
    success: true,
    output_image_url: a.fusion_result.output_image_url,
    source_map_image_url: a.fusion_result.source_map_image_url,
    quality_improvement: a.fusion_result.quality_improvement,
  });
});
