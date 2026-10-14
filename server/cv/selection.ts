/**
 * Best-Information Source Selection
 * Core LUNIQ Novelty: Intelligent multi-observation source selection per grid
 */

import { GridCell, SourceSelection } from '../../src/types.ts';

export function selectBestInformationSources(
  allGridsByObs: Record<string, GridCell[]>, // code -> GridCell[]
  gridCount: 4 | 8 | 16
): {
  selections: SourceSelection[];
  markedGrids: GridCell[];
} {
  const selections: SourceSelection[] = [];
  const markedGrids: GridCell[] = [];
  const obsCodes = Object.keys(allGridsByObs);

  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      // Find matching cell across all observations
      const candidates: { code: string; cell: GridCell }[] = [];

      for (const code of obsCodes) {
        const cell = allGridsByObs[code].find(
          (g) => g.row_index === r && g.column_index === c
        );
        if (cell) candidates.push({ code, cell });
      }

      if (candidates.length === 0) continue;

      // Sort by quality score descending
      candidates.sort((a, b) => b.cell.quality_score - a.cell.quality_score);
      const winner = candidates[0];
      const runnerUp = candidates.length > 1 ? candidates[1] : null;

      // Formulate detailed scientific selection reason
      let reason = `Observation ${winner.code} selected (Quality: ${winner.cell.quality_score.toFixed(2)})`;
      if (runnerUp) {
        const delta = ((winner.cell.quality_score - runnerUp.cell.quality_score) / Math.max(0.01, runnerUp.cell.quality_score)) * 100;
        const sharpAdv = winner.cell.sharpness > runnerUp.cell.sharpness;
        const shadowAdv = winner.cell.shadow_coverage < runnerUp.cell.shadow_coverage;

        const factors: string[] = [];
        if (sharpAdv) factors.push(`higher sharpness (${winner.cell.sharpness.toFixed(2)} vs ${runnerUp.cell.sharpness.toFixed(2)})`);
        if (shadowAdv) factors.push(`lower shadow coverage (${(winner.cell.shadow_coverage * 100).toFixed(0)}% vs ${(runnerUp.cell.shadow_coverage * 100).toFixed(0)}%)`);
        if (winner.cell.contrast > runnerUp.cell.contrast) factors.push(`enhanced RMS contrast (${winner.cell.contrast.toFixed(2)})`);

        const factorsStr = factors.length > 0 ? factors.join(', ') : 'overall photometric balance';
        reason = `Observation ${winner.code} selected (+${delta.toFixed(0)}% over ${runnerUp.code}): ${factorsStr}.`;
      }

      const alternatives = candidates.map((c) => ({
        observation_id: c.cell.observation_id,
        code: c.code,
        score: c.cell.quality_score,
        sharpness: c.cell.sharpness,
        shadow_coverage: c.cell.shadow_coverage,
      }));

      selections.push({
        grid_id: winner.cell.id,
        row_index: r,
        column_index: c,
        selected_observation_id: winner.cell.observation_id,
        selected_code: winner.code,
        selection_score: winner.cell.quality_score,
        selection_reason: reason,
        alternatives,
      });

      // Mark winner and alternatives
      for (const cand of candidates) {
        const isSelected = cand.code === winner.code;
        markedGrids.push({
          ...cand.cell,
          selected: isSelected,
          source_observation_id: winner.cell.observation_id,
          selection_reason: reason,
        });
      }
    }
  }

  return { selections, markedGrids };
}
