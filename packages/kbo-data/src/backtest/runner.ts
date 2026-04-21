/**
 * 백테스트 오케스트레이터. decided 경기 전체를 시간순으로 순회하며,
 * 각 경기 시점에 feature 재구성 → 모델들에 적용 → Brier/LogLoss/Acc/Calibration.
 *
 * prior games 누적은 시즌별로 리셋 — h2h, recent form 모두 시즌 내만.
 */

import type { FinishedGame } from '../engine/form';
import type { EloHistory } from './elo-history';
import { buildFeatures } from './loader';
import { computeMetrics } from './metrics';
import type { BacktestGame, MetricsSummary, Model } from './types';

export interface RunnerInput {
  games: BacktestGame[]; // 시간순 정렬된 decided 경기
  eloHistory: EloHistory;
  models: Record<string, Model>;
}

export interface RunnerOutput {
  perModel: Record<string, MetricsSummary>;
  /** Elo 조회 실패 등으로 skip 된 경기 수. */
  skipped: number;
  used: number;
}

export function runBacktest(input: RunnerInput): RunnerOutput {
  const { games, eloHistory, models } = input;

  // 시즌별 prior 누적 버퍼 (FinishedGame[] — desc 정렬 유지)
  const priorBySeason = new Map<number, FinishedGame[]>();

  const probs: Record<string, number[]> = {};
  const outcomes: number[] = [];
  for (const name of Object.keys(models)) probs[name] = [];

  let skipped = 0;
  let used = 0;

  for (const g of games) {
    const prior = priorBySeason.get(g.season) ?? [];
    const features = buildFeatures(g, prior, eloHistory);
    if (features) {
      used++;
      outcomes.push(g.homeWon ? 1 : 0);
      for (const [name, model] of Object.entries(models)) {
        probs[name].push(model(features));
      }
    } else {
      skipped++;
    }

    // 경기 결과를 prior 에 push — 다음 경기용. desc 정렬이므로 unshift.
    prior.unshift({
      home_team_id: g.homeTeamId,
      away_team_id: g.awayTeamId,
      winner_team_id: g.homeWon ? g.homeTeamId : g.awayTeamId,
    });
    priorBySeason.set(g.season, prior);
  }

  const perModel: Record<string, MetricsSummary> = {};
  for (const name of Object.keys(models)) {
    perModel[name] = computeMetrics(probs[name], outcomes);
  }

  return { perModel, skipped, used };
}
