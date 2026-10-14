/**
 * LUNIQ Type Definitions
 * Scientific data structures for lunar image registration, local quality analysis,
 * and multi-observation reconstruction.
 */

export type ProvenanceType = 'CALCULATED' | 'ESTIMATED' | 'SIMULATED' | 'DEMO' | 'NOT AVAILABLE';

export interface Mission {
  id: string;
  mission_name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  target_feature: string;
  created_at: string;
  updated_at: string;
  observation_count?: number;
}

export interface Observation {
  id: string;
  mission_id: string;
  name: string;
  code: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  source: string;
  filename: string;
  storage_key: string;
  width: number;
  height: number;
  channels: number;
  bit_depth: number;
  format: string;
  acquisition_timestamp: string;
  latitude: number;
  longitude: number;
  sun_azimuth: number; // degrees 0-360
  sun_elevation: number; // degrees 0-90
  solar_incidence_angle: number; // degrees
  viewing_angle: number; // degrees
  rotation: number; // degrees
  scale: number; // 1.0 = baseline
  metadata_json: Record<string, any>;
  data_url?: string;
  created_at: string;
  light_projection_angle?: number | null; // User-editable Light Projection Angle (0°-360°)
  brightness?: number; // Visual brightness adjustment (50-150%, default 100)
  contrast?: number; // Visual contrast adjustment (50-200%, default 100)
}

export interface AnalysisConfiguration {
  grid_size: 4 | 8 | 16;
  feature_method: 'SIFT' | 'LoFTR' | 'Hybrid-FAST';
  matching_method: 'Lowe-Ratio-SIFT' | 'LoFTR-Dense';
  ransac_threshold: number;
  transformation_type: 'Homography' | 'Affine' | 'Similarity';
  quality_weights: {
    sharpness: number;
    contrast: number;
    texture: number;
    feature_strength: number;
    illumination: number;
    registration: number;
    shadow_penalty: number;
    reprojection_penalty: number;
  };
  illumination_normalization: boolean;
  fusion_method: 'Multiband-Distance-Blend' | 'Weighted-Feather';
}

export interface AnalysisStep {
  id: string;
  analysis_id: string;
  step_name: string;
  display_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  metrics_json?: Record<string, any>;
  error_message?: string;
}

export interface GridCell {
  id: string;
  analysis_id: string;
  observation_id: string;
  observation_code: string;
  row_index: number;
  column_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  quality_score: number;
  sharpness: number;
  contrast: number;
  texture: number;
  feature_strength: number;
  illumination_quality: number;
  shadow_coverage: number;
  registration_confidence: number;
  reprojection_error: number;
  selected: boolean;
  source_observation_id: string;
  selection_reason?: string;
}

export interface IlluminationAnalysis {
  id: string;
  observation_id: string;
  observation_code: string;
  sun_azimuth: number;
  sun_elevation: number;
  solar_incidence_angle: number;
  illumination_direction_x: number;
  illumination_direction_y: number;
  shadow_direction_x: number;
  shadow_direction_y: number;
  shadow_coverage: number;
  confidence: number;
  method: string;
  provenance: ProvenanceType;
  metadata_json: Record<string, any>;
}

export interface ViewingGeometry {
  id: string;
  observation_id: string;
  observation_code: string;
  viewing_angle: number;
  emission_angle: number;
  camera_direction_x: number;
  camera_direction_y: number;
  rotation: number;
  scale: number;
  perspective_distortion: number;
  confidence: number;
  method: string;
  provenance: ProvenanceType;
  metadata_json: Record<string, any>;
}

export interface Keypoint {
  x: number;
  y: number;
  size: number;
  angle: number;
  response: number;
}

export interface FeatureResult {
  id: string;
  observation_id: string;
  observation_code: string;
  method: string;
  keypoint_count: number;
  descriptor_dimension: number;
  keypoints: Keypoint[];
  confidence: number;
  processing_time_ms: number;
  provenance: ProvenanceType;
}

export interface MatchPair {
  src_pt: [number, number]; // [x, y] in reference
  dst_pt: [number, number]; // [x, y] in target
  distance: number;
  inlier: boolean;
  confidence: number;
}

export interface MatchResult {
  id: string;
  analysis_id: string;
  source_observation_id: string;
  target_observation_id: string;
  target_code: string;
  method: string;
  candidate_matches: number;
  good_matches: number;
  inlier_matches: number;
  inlier_ratio: number;
  mean_match_confidence: number;
  processing_time_ms: number;
  matches_data: MatchPair[];
  provenance: ProvenanceType;
}

export interface RegistrationResult {
  id: string;
  analysis_id: string;
  source_observation_id: string;
  target_observation_id: string;
  target_code: string;
  transformation_type: 'Homography' | 'Affine' | 'Similarity';
  transformation_matrix: number[][]; // 3x3
  mean_reprojection_error: number; // in pixels
  median_reprojection_error: number;
  max_reprojection_error: number;
  inlier_ratio: number;
  registration_confidence: number;
  processing_time_ms: number;
  warped_image_url?: string;
  diff_image_url?: string;
}

export interface SourceSelection {
  grid_id: string;
  row_index: number;
  column_index: number;
  selected_observation_id: string;
  selected_code: string;
  selection_score: number;
  selection_reason: string;
  alternatives: Array<{
    observation_id: string;
    code: string;
    score: number;
    sharpness: number;
    shadow_coverage: number;
  }>;
}

export interface FusionResult {
  id: string;
  analysis_id: string;
  output_storage_key: string;
  output_image_url: string;
  source_map_storage_key: string;
  source_map_image_url: string;
  difference_storage_key?: string;
  difference_image_url?: string;
  width: number;
  height: number;
  mean_quality: number;
  quality_improvement: number; // percentage
  seam_score: number; // boundary discontinuity metric
  processing_time_ms: number;
  source_distribution: Record<string, number>; // code -> percentage
}

export interface ValidationResult {
  id: string;
  analysis_id: string;
  mean_reprojection_error: number;
  median_reprojection_error: number;
  max_reprojection_error: number;
  mean_inlier_ratio: number;
  average_quality: number;
  quality_improvement: number;
  feature_retention: number;
  registration_confidence: number;
  validation_status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED';
  metrics_json: Record<string, any>;
  efficiency: {
    total_grids: number;
    candidate_grids: number;
    skipped_grids: number;
    feature_calls: number;
    ransac_calls: number;
    processing_time_ms: number;
  };
}

export interface AIInsight {
  id: string;
  analysis_id: string;
  generated_at: string;
  model: string;
  geomorphic_summary: string;
  illumination_assessment: string;
  permanently_shadowed_regions: string;
  reconstruction_confidence_notes: string;
  recommendations: string[];
}

export interface Analysis {
  id: string;
  mission_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  reference_observation_id: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  processing_time_ms?: number;
  error_message?: string;
  configuration: AnalysisConfiguration;
  steps: AnalysisStep[];
  grids: GridCell[];
  illumination_analyses: IlluminationAnalysis[];
  viewing_geometries: ViewingGeometry[];
  feature_results: FeatureResult[];
  match_results: MatchResult[];
  registration_results: RegistrationResult[];
  source_selections: SourceSelection[];
  fusion_result?: FusionResult;
  validation_result?: ValidationResult;
  ai_insight?: AIInsight;
}
