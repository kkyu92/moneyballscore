"use client";

/**
 * FactorWaterfallChart — 10 factor contribution waterfall.
 *
 * neutral NEUTRAL_FACTOR baseline 시작 → 각 factor contribution 누적 → final home win prob.
 * recharts ComposedChart 활용 (이미 dependency).
 *
 * 사용자 가시 가치: 모델 prob 도출 path 시각화 — 어느 factor 가 어느 방향
 * (home/away) 으로 prob 변화시켰는지 직접 가시.
 *
 * 통합: analysis/game/[id]/page.tsx 안 DetailedFactorAnalysis 다음 박제.
 */

import { DEFAULT_WEIGHTS, HOME_ADVANTAGE, NEUTRAL_FACTOR, WINNER_PROB_CLAMP_MIN, WINNER_PROB_CLAMP_MAX, clampWinnerProb, type TeamCode, shortTeamName } from "@moneyball/shared";
import {
  Bar,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { FACTOR_LABELS, NEUTRAL_HI, NEUTRAL_LO } from "@/lib/predictions/factorLabels";

interface Props {
  factors: Record<string, number>;
  homeTeam: TeamCode;
  awayTeam: TeamCode;
}

interface WaterfallBar {
  factor: string;
  label: string;
  rawValue: number;
  weight: number;
  contribution: number; // pp (e.g., +0.012 = +1.2pp home favor)
  cumulative: number; // running prob after applying this bar
  base: number; // bar starting y
  end: number; // bar ending y
  direction: "home" | "away" | "neutral";
}

// FACTOR_LABELS map 안 한국어 label 활용. neutral 시 0 contribution.
function computeWaterfall(factors: Record<string, number>): WaterfallBar[] {
  const bars: WaterfallBar[] = [];
  let cumulative = NEUTRAL_FACTOR; // neutral start

  // home advantage 추가 (DEFAULT_WEIGHTS 안 factor X — 별도)
  bars.push({
    factor: "home_advantage",
    label: "홈팀 어드밴티지",
    rawValue: NEUTRAL_FACTOR + HOME_ADVANTAGE,
    weight: 0,
    contribution: HOME_ADVANTAGE,
    cumulative: cumulative + HOME_ADVANTAGE,
    base: cumulative,
    end: cumulative + HOME_ADVANTAGE,
    direction: "home",
  });
  cumulative += HOME_ADVANTAGE;

  for (const [key, weight] of Object.entries(DEFAULT_WEIGHTS)) {
    const rawValue = factors[key];
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) continue;
    if (weight === 0) continue; // shadow factor skip

    // contribution = (rawValue - NEUTRAL_FACTOR) × weight (home favor 기준)
    const contribution = (rawValue - NEUTRAL_FACTOR) * weight;
    const direction: "home" | "away" | "neutral" =
      rawValue > NEUTRAL_HI ? "home" : rawValue < NEUTRAL_LO ? "away" : "neutral";
    const newCumulative = cumulative + contribution;
    bars.push({
      factor: key,
      label: FACTOR_LABELS[key] ?? key,
      rawValue,
      weight,
      contribution,
      cumulative: newCumulative,
      base: cumulative,
      end: newCumulative,
      direction,
    });
    cumulative = newCumulative;
  }

  // clamp — WINNER_PROB_CLAMP_MIN/MAX 단일 source (predictor.ts 정합)
  const finalProb = clampWinnerProb(cumulative);
  bars.push({
    factor: "final",
    label: "최종 확률",
    rawValue: finalProb,
    weight: 0,
    contribution: finalProb - NEUTRAL_FACTOR,
    cumulative: finalProb,
    base: NEUTRAL_FACTOR,
    end: finalProb,
    direction: finalProb >= NEUTRAL_FACTOR ? "home" : "away",
  });

  return bars;
}

interface TooltipPayloadEntry {
  payload?: WaterfallBar;
}
interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const bar = payload[0]?.payload;
  if (!bar) return null;
  const ppSign = bar.contribution > 0 ? "+" : "";
  return (
    <div className="bg-white dark:bg-brand-900 border border-brand-200 dark:border-brand-700 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-brand-700 dark:text-brand-100">{bar.label}</div>
      <div className="text-brand-600 dark:text-brand-300 mt-1">
        raw: <span className="font-mono">{bar.rawValue.toFixed(3)}</span>
      </div>
      <div className="text-brand-600 dark:text-brand-300">
        weight: <span className="font-mono">{(bar.weight * 100).toFixed(0)}%</span>
      </div>
      <div
        className={`font-semibold mt-1 ${bar.direction === "home" ? "text-brand-600" : bar.direction === "away" ? "text-red-600" : "text-brand-400"}`}
      >
        영향: {ppSign}
        {(bar.contribution * 100).toFixed(2)}pp
      </div>
      <div className="text-brand-500 dark:text-brand-400 mt-1">
        누적 prob: <span className="font-mono">{(bar.cumulative * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function FactorWaterfallChart({ factors, homeTeam, awayTeam }: Props) {
  const bars = computeWaterfall(factors);
  const homeName = shortTeamName(homeTeam);
  const awayName = shortTeamName(awayTeam);

  return (
    <section
      aria-labelledby="factor-waterfall-heading"
      className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-brand-950 p-4 md:p-6"
    >
      <header className="mb-4">
        <h2
          id="factor-waterfall-heading"
          className="text-lg md:text-xl font-bold text-brand-700 dark:text-brand-100"
        >
          팩터 누적 영향 (waterfall)
        </h2>
        <p className="text-xs md:text-sm text-brand-500 dark:text-brand-400 mt-1">
          중립 50% 시작 → 각 팩터 영향 누적 → 최종 {homeName} 승리 확률. 우(녹색)=홈 유리 / 좌(빨강)=원정 유리.
        </p>
      </header>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={bars}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
          >
            <XAxis
              type="number"
              domain={[WINNER_PROB_CLAMP_MIN, WINNER_PROB_CLAMP_MAX]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fill: "var(--color-brand-500)", fontSize: 11 }}
              stroke="var(--color-brand-300)"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={80}
              tick={{ fill: "var(--color-brand-600)", fontSize: 11 }}
              stroke="var(--color-brand-300)"
            />
            <ReferenceLine x={NEUTRAL_FACTOR} stroke="var(--color-brand-400)" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-brand-50)" }} />
            <Bar
              dataKey={(d: WaterfallBar) => [d.base, d.end]}
              fill="var(--color-brand-500)"
              radius={[3, 3, 3, 3]}
            >
              {bars.map((bar, idx) => (
                <Cell
                  key={idx}
                  fill={
                    bar.factor === "final"
                      ? "var(--color-brand-700)"
                      : bar.direction === "home"
                        ? "var(--color-brand-500)"
                        : bar.direction === "away"
                          ? "#dc2626"
                          : "var(--color-brand-300)"
                  }
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-brand-400 dark:text-brand-500 mt-3 text-center">
        {awayName} @ {homeName} · 가중치 합 = 1.0 / 홈 어드밴티지 +1.5pp 별도 / 최종 [15%, 85%] clamp
      </p>
    </section>
  );
}
