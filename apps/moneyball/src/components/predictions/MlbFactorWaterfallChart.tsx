"use client";

/**
 * MlbFactorWaterfallChart — MLB game-detail 팩터 누적 영향 waterfall.
 * KBO FactorWaterfallChart.tsx 시각 패턴 재사용, 계산은 computeMlbWaterfall
 * (mlb-base.ts computeMlbProbability 와 동일 계수 — bar 합 = home_win_prob 보장).
 */

import { computeMlbWaterfall, type MlbWaterfallInput } from "@moneyball/kbo-data";
import { WINNER_PROB_CLAMP_MIN, WINNER_PROB_CLAMP_MAX, mlbShortTeamName, type MlbTeamCode } from "@moneyball/shared";
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

interface Props {
  input: MlbWaterfallInput;
  homeTeam: MlbTeamCode;
  awayTeam: MlbTeamCode;
  locale?: "ko" | "en";
}

interface TooltipPayloadEntry {
  payload?: ReturnType<typeof computeMlbWaterfall>[number];
}
interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  locale?: "ko" | "en";
}

function CustomTooltip({ active, payload, locale = "ko" }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const bar = payload[0]?.payload;
  if (!bar) return null;
  const ppSign = bar.contribution > 0 ? "+" : "";
  return (
    <div className="bg-white dark:bg-brand-900 border border-brand-200 dark:border-brand-700 rounded-lg shadow-lg p-3 text-xs">
      <div className="font-semibold text-brand-700 dark:text-brand-100">{bar.label}</div>
      <div
        className={`font-semibold mt-1 ${bar.direction === "home" ? "text-brand-600" : bar.direction === "away" ? "text-red-600" : "text-brand-400"}`}
      >
        {locale === "en" ? "Impact" : "영향"}: {ppSign}
        {(bar.contribution * 100).toFixed(2)}pp
      </div>
      <div className="text-brand-500 dark:text-brand-400 mt-1">
        {locale === "en" ? "Cumulative prob" : "누적 prob"}: <span className="font-mono">{(bar.cumulative * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function MlbFactorWaterfallChart({ input, homeTeam, awayTeam, locale = "ko" }: Props) {
  const bars = computeMlbWaterfall({ ...input, locale });
  const homeName = mlbShortTeamName(homeTeam);
  const awayName = mlbShortTeamName(awayTeam);

  return (
    <section
      aria-labelledby="mlb-factor-waterfall-heading"
      className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-[var(--color-surface-card)] p-4 md:p-6"
    >
      <header className="mb-4">
        <h2
          id="mlb-factor-waterfall-heading"
          className="text-lg md:text-xl font-bold text-brand-700 dark:text-brand-100"
        >
          {locale === "en" ? "Cumulative Factor Impact (waterfall)" : "팩터 누적 영향 (waterfall)"}
        </h2>
        <p className="text-xs md:text-sm text-brand-500 dark:text-brand-400 mt-1">
          {locale === "en"
            ? `Starts at a neutral 50% → each factor's impact accumulates → final ${homeName} win probability. Right (green) = home favored / left (red) = away favored. Defense SFR is an unimplemented MLB placeholder (always neutral) and is omitted from this chart — Elo, recent form, and head-to-head are real per-team data.`
            : `중립 50% 시작 → 각 팩터 영향 누적 → 최종 ${homeName} 승리 확률. 우(녹색)=홈 유리 / 좌(빨강)=원정 유리. 수비SFR 은 MLB 미구현 placeholder(항상 중립)라 본 차트엔 미표시 — Elo·최근폼·상대전적은 실측 데이터입니다.`}
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
            <ReferenceLine x={0.5} stroke="var(--color-brand-400)" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip locale={locale} />} cursor={{ fill: "var(--color-brand-50)" }} />
            <Bar
              dataKey={(d: ReturnType<typeof computeMlbWaterfall>[number]) => [d.base, d.end]}
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
                          ? "var(--color-error)"
                          : "var(--color-brand-300)"
                  }
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-brand-400 dark:text-brand-500 mt-3 text-center">
        {awayName} @ {homeName} · {locale === "en" ? "final" : "최종"} [{Math.round(WINNER_PROB_CLAMP_MIN * 100)}%, {Math.round(WINNER_PROB_CLAMP_MAX * 100)}%] clamp
      </p>
    </section>
  );
}
