import type { Metadata } from "next";
import Link from "next/link";
import { MLB_BASE_WEIGHTS, MLB_FACTOR_COUNTS, MetricRegistry } from "@moneyball/kbo-data";
import { V2_PROMOTION_COHORT_N, HOME_ADVANTAGE_PCT, RECENT_FORM_GAMES, HOME_ELO_BONUS, MLB_ISR_SECONDS } from "@moneyball/shared";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const revalidate = MLB_ISR_SECONDS;

const SITE_URL = "https://moneyballscore.vercel.app";

const TOTAL = MLB_FACTOR_COUNTS.total;
const KBO_N = MLB_FACTOR_COUNTS.kbo;
const STAT_N = MLB_FACTOR_COUNTS.statcast;
const TITLE_KO = `MLB ${TOTAL}팩터 본선 가중치 | MoneyBall Score`;
const SUMMARY_KO = `KBO ${KBO_N} + Statcast ${STAT_N} 의 ${TOTAL}팩터 본선 = MLB 예측 모델의 기반 가중치 표.`;

export const metadata: Metadata = {
  title: `MLB ${TOTAL}팩터 본선 — 가중치 + 설명 + 출처 | MoneyBall Score`,
  description:
    `MLB ${TOTAL}팩터 본선 가중치 표 — KBO ${KBO_N} (FIP · xFIP · wOBA · 불펜FIP · 최근폼 · WAR · 상대전적 · 구장보정 · Elo · 수비SFR) + Statcast ${STAT_N} (xwOBA · Barrel% · xwOBA-against · wOBA std). 각 팩터 정의 + 출처 + 적용 방식.`,
  alternates: {
    canonical: `${SITE_URL}/mlb/factors`,
    languages: {
      en: `${SITE_URL}/en/mlb/factors`,
      ko: `${SITE_URL}/mlb/factors`,
    },
  },
  openGraph: {
    title: TITLE_KO,
    description: SUMMARY_KO,
    url: `${SITE_URL}/mlb/factors`,
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_KO,
    description: SUMMARY_KO,
  },
};

type FactorRow = {
  key: keyof typeof MLB_BASE_WEIGHTS;
  label: string;
  shortLabel: string;
  category: "선발" | "타선" | "불펜" | "팀폼" | "기록" | "구장" | "레이팅" | "수비" | "Statcast" | "보너스";
  range: string;
  description: string;
  why: string;
  source: string;
};

// KBO 10 factor 라벨 = MetricRegistry.ko_name 단일 source — silent drift wave 60 (cycle 1256 박제).
// MLB MLB_BASE_WEIGHTS.defense_sfr key = MetricRegistry.sfr slug 매핑.
const KBO_10_FACTORS: readonly FactorRow[] = [
  {
    key: "sp_fip",
    label: `${MetricRegistry.sp_fip.ko_name} (Fielding Independent Pitching)`,
    shortLabel: MetricRegistry.sp_fip.ko_name,
    category: "선발",
    range: "1.50 ~ 6.00",
    description:
      "투수의 삼진 · 볼넷 · 홈런 만으로 추정한 ERA. 야수 영향 제거 = 진짜 투수 실력. 낮을수록 유리.",
    why: `선발 투수 매치업이 단일 경기 최대 영향 = ${TOTAL}팩터 본선 안 가중치 2위.`,
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "sp_xfip",
    label: MetricRegistry.sp_xfip.ko_name,
    shortLabel: MetricRegistry.sp_xfip.ko_name,
    category: "선발",
    range: "1.50 ~ 6.00",
    description:
      "FIP 의 홈런 부분을 league 평균 HR/FB 로 정규화. 운 (특히 홈런 잡음) 제거 후 진짜 컨택 억제력.",
    why: "FIP 의 홈런 잡음 제거 → small sample 안 의미 ↑. FIP 보조 layer.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "lineup_woba",
    label: `${MetricRegistry.lineup_woba.ko_name} (Weighted On-Base Average)`,
    shortLabel: MetricRegistry.lineup_woba.ko_name,
    category: "타선",
    range: "0.250 ~ 0.420",
    description:
      "BB / HBP / 1B / 2B / 3B / HR 각 결과의 run 가치 가중 평균. 출루율 보다 정확한 타격 생산성.",
    why: "타선 production = 매 경기 score 생성 capacity. 선발 FIP 와 함께 본선 가중치 1위.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "bullpen_fip",
    label: `${MetricRegistry.bullpen_fip.ko_name} (Bullpen Aggregate)`,
    shortLabel: MetricRegistry.bullpen_fip.ko_name,
    category: "불펜",
    range: "2.50 ~ 6.00",
    description:
      "팀 불펜 (선발 외 모든 등판) 의 가중 평균 FIP. 후반 inning leverage 가 큰 측정.",
    why: "선발 5~6 inning 후 불펜 시점 = 박빙 경기 결정 layer. close game leverage ↑.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "recent_form",
    label: `${MetricRegistry.recent_form.ko_name} (Last ${RECENT_FORM_GAMES} Games)`,
    shortLabel: MetricRegistry.recent_form.ko_name,
    category: "팀폼",
    range: "-3 ~ +3",
    description:
      `최근 ${RECENT_FORM_GAMES}경기 승률 - 시즌 승률 의 차분. 추세 (모멘텀) 측정. ±0 = 시즌 baseline, +0.3 = 큰 hot streak.`,
    why: "선수 컨디션 / 불펜 피로 / 라인업 hot zone 등 매일 변동 layer. fade or follow signal.",
    source: "statsapi.mlb.com (boxscore aggregate)",
  },
  {
    key: "war",
    label: `${MetricRegistry.war.ko_name} (Wins Above Replacement)`,
    shortLabel: MetricRegistry.war.ko_name,
    category: "기록",
    range: "-2 ~ +12 (선수당)",
    description:
      "선수 1명이 replacement-level 대비 win 기여 측정. 팀 라인업 WAR 합 = 시즌 talent 총량.",
    why: "장기 talent base. recent form 이 short-term 이면 WAR 는 long-term layer.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
  {
    key: "head_to_head",
    label: `${MetricRegistry.head_to_head.ko_name} (H2H)`,
    shortLabel: "H2H",
    category: "기록",
    range: "0.00 ~ 1.00",
    description:
      "두 팀 시즌 안 직접 대결 승률. 매치업 (구장 / 라이벌리 / 특정 투수 vs 라인업) 박제 layer.",
    why: "small sample (시즌 ~13~19 경기) but 매치업 quirk 박제. 가중치 3% 작은 layer.",
    source: "statsapi.mlb.com (schedule aggregate)",
  },
  {
    key: "park_factor",
    label: `${MetricRegistry.park_factor.ko_name} (Park Factor)`,
    shortLabel: "PF",
    category: "구장",
    range: "85 ~ 115",
    description:
      "홈 구장의 run 환경 (타자 친화 / 투수 친화). Coors Field ~115 (타자) / Petco ~95 (투수). 100 = neutral.",
    why: "홈 구장 환경 적응 = 홈 advantage 의 한 축. wOBA / FIP 등 stat 의 ballpark adjust 보완.",
    source: "FanGraphs MLB · ESPN Park Factor",
  },
  {
    key: "elo",
    label: MetricRegistry.elo.ko_name,
    shortLabel: "Elo",
    category: "레이팅",
    range: "1300 ~ 1700",
    description:
      "체스 Elo 의 야구 변형 = 매 경기 결과 보고 두 팀 rating 갱신. 시즌 절반 후 stable.",
    why: "단일 metric 으로 팀 강약 표현. 정보가치 Δ=+0.30 으로 본선 안 최강 (KBO backtest).",
    source: "KBO Fancy Stats Elo · MLB FiveThirtyEight Elo (legacy)",
  },
  {
    key: "defense_sfr",
    label: `${MetricRegistry.sfr.ko_name} (Skill-Free Runs)`,
    shortLabel: MetricRegistry.sfr.ko_name,
    category: "수비",
    range: "-30 ~ +30 (팀)",
    description:
      "수비로 막아낸 run 수. 정상 수비 대비 + 또는 - 의 run prevented / cost.",
    why: "수비 layer 가 FIP 안 missing — SFR 가 보완. small sample 시 noise ↑.",
    source: "FanGraphs MLB Def · KBO Fancy Stats SFR",
  },
];

const STATCAST_4_FACTORS: readonly FactorRow[] = [
  {
    key: "lineup_xwoba",
    label: "타선 xwOBA (Expected wOBA)",
    shortLabel: "타선 xwOBA",
    category: "Statcast",
    range: "0.250 ~ 0.420",
    description:
      "타구의 발사 각도 + 타구 속도로 추정한 기대 wOBA. 운 (수비 / 구장 / 날씨) 제거 후 진짜 컨택 품질.",
    why: "wOBA 의 결과 잡음 제거 → small sample 안 의미 ↑. 본선 안 Statcast 1번 가중치.",
    source: "Baseball Savant (Statcast Era 2015~)",
  },
  {
    key: "lineup_barrel_pct",
    label: "Barrel %",
    shortLabel: "Barrel%",
    category: "Statcast",
    range: "0% ~ 25%",
    description:
      "Barrel = 최소 발사 각도 + 타구 속도 임계 만족 = 평균 .500+ AVG / 1.500+ SLG 기대. 타석당 % 비율.",
    why: "강타 빈도 = 홈런 + 장타 production capacity 의 raw signal.",
    source: "Baseball Savant (Barrel 정의 2015 Tom Tango)",
  },
  {
    key: "sp_xwoba_against",
    label: "선발 xwOBA-against",
    shortLabel: "선발 xwOBA-a",
    category: "Statcast",
    range: "0.250 ~ 0.420",
    description:
      "선발 투수가 허용한 타구의 xwOBA. 낮을수록 좋은 컨택 억제력. FIP 와 보완 layer.",
    why: "FIP 의 K / BB / HR 외 batted ball quality layer. Statcast 안 투수 측 핵심.",
    source: "Baseball Savant (Statcast pitching)",
  },
  {
    key: "woba_std",
    label: "wOBA 표준편차 (variance)",
    shortLabel: "wOBA σ",
    category: "Statcast",
    range: "0.020 ~ 0.080",
    description:
      "라인업 안 타자별 wOBA 의 표준편차. 낮으면 균일 라인업, 높으면 stars-and-scrubs.",
    why: "라인업 depth 측정. 동일 평균 wOBA 도 σ 따라 run distribution 다름.",
    source: "FanGraphs MLB · KBO Fancy Stats",
  },
];

const HOME_BONUS: FactorRow = {
  key: "home_elo_bonus",
  label: "홈 어드밴티지 (Elo bonus)",
  shortLabel: "Home Elo bonus",
  category: "보너스",
  range: `+${HOME_ELO_BONUS} Elo (~ +3.4%)`,
  description:
    `홈팀에 가산되는 Elo bonus ${HOME_ELO_BONUS}점 = 승률 약 +3.4% (Elo 400 변환 기준). 구장 친숙 + travel fatigue 차이 + 관중 layer.`,
  why: "homefield advantage 의 정량화 layer. 매 경기 일관 박제.",
  source: `FiveThirtyEight Elo (MLB) · KBO 자체 측정 +${HOME_ADVANTAGE_PCT.toFixed(1)}%`,
};

function weightPercent(weight: number): string {
  return `${(weight * 100).toFixed(0)}%`;
}

function totalWeight(): number {
  return Object.values(MLB_BASE_WEIGHTS).reduce<number>((sum, w) => sum + w, 0);
}

export default function MlbFactorsHub() {
  const allFactors: FactorRow[] = [...KBO_10_FACTORS, ...STATCAST_4_FACTORS];
  const sum = totalWeight();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `MLB ${TOTAL}팩터 본선 가중치 + 설명`,
    description:
      `MLB ${TOTAL}팩터 본선 = KBO ${KBO_N} + Statcast ${STAT_N}. 각 팩터의 가중치 / 정의 / 출처 / 적용 방식.`,
    url: `${SITE_URL}/mlb/factors`,
    author: { "@type": "Organization", name: "MoneyBall Score" },
    about: { "@type": "Thing", name: "MLB sabermetrics prediction model" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/mlb/factors` },
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 md:py-10 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb
        items={[
          { href: "/mlb", label: "MLB 분석" },
          { label: `${TOTAL}팩터 본선` },
        ]}
      />

      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">MLB {TOTAL}팩터 본선</h1>
        <p className="text-gray-500 dark:text-gray-400">
          KBO {KBO_N}팩터 (FIP · xFIP · wOBA · 불펜 FIP · 최근폼 · WAR · 상대전적 · 구장보정 · Elo · 수비 SFR) +{" "}
          <Link href="/mlb/players" className="underline">
            Statcast {STAT_N}
          </Link>{" "}
          (xwOBA · Barrel% · xwOBA-against · wOBA σ) = {TOTAL}팩터.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          가중치 합 = {weightPercent(sum)} (홈 보너스 {weightPercent(MLB_BASE_WEIGHTS.home_elo_bonus)} 포함). 본 가중치 ={" "}
          <code>packages/kbo-data/src/factors/mlb-base.ts</code> 정의. 모델 진화 (n={V2_PROMOTION_COHORT_N} forward cohort 후) 시 갱신.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="weight-summary">
        <h2
          id="weight-summary"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          가중치 표 (요약)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="text-left py-2 px-3">팩터</th>
                <th scope="col" className="text-left py-2 px-3">카테고리</th>
                <th scope="col" className="text-right py-2 px-3">가중치</th>
                <th scope="col" className="text-left py-2 px-3 hidden md:table-cell">range</th>
              </tr>
            </thead>
            <tbody>
              {allFactors.map((f) => (
                <tr
                  key={f.key}
                  className="border-t border-gray-100 dark:border-[var(--color-border)] hover:bg-gray-50/50 dark:hover:bg-white/5"
                >
                  <td className="py-2 px-3 font-medium">
                    <a href={`#${f.key}`} className="hover:underline">
                      {f.shortLabel}
                    </a>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">{f.category}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    {weightPercent(MLB_BASE_WEIGHTS[f.key])}
                  </td>
                  <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-400 dark:text-gray-500">
                    {f.range}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 dark:border-[var(--color-border)] font-semibold">
                <td className="py-2 px-3" colSpan={2}>
                  {HOME_BONUS.shortLabel}{" "}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">({HOME_BONUS.range})</span>
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {weightPercent(MLB_BASE_WEIGHTS.home_elo_bonus)}
                </td>
                <td className="py-2 px-3 hidden md:table-cell text-xs text-gray-400 dark:text-gray-500">
                  보너스
                </td>
              </tr>
              <tr className="border-t-2 border-gray-400 dark:border-[var(--color-border)] font-bold">
                <td className="py-2 px-3" colSpan={2}>합계</td>
                <td className="py-2 px-3 text-right font-mono">{weightPercent(sum)}</td>
                <td className="hidden md:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-6" aria-labelledby="kbo-10-heading">
        <h2
          id="kbo-10-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          KBO {KBO_N}팩터 (동등)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          KBO 모델 v1.8 의 {KBO_N}팩터를 MLB 도메인에 그대로 매핑. data source 만 statsapi.mlb / FanGraphs MLB 로 교체.
        </p>
        <ol className="space-y-4">
          {KBO_10_FACTORS.map((factor, idx) => (
            <li
              key={factor.key}
              id={factor.key}
              className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2 scroll-mt-20"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-brand-700 dark:text-brand-100">
                  {idx + 1}. {factor.label}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200 shrink-0 font-mono">
                  {weightPercent(MLB_BASE_WEIGHTS[factor.key])}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                카테고리: {factor.category} · range {factor.range}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{factor.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">왜 중요한가:</span> {factor.why}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                출처: {factor.source}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-6" aria-labelledby="statcast-4-heading">
        <h2
          id="statcast-4-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          Statcast {STAT_N}팩터 (MLB 전용 layer)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          MLB Statcast Era (2015~) 가 제공하는 batted-ball 측정 layer = KBO 모델에 없는 {STAT_N}팩터. 자세한 팀별 측정 ={" "}
          <Link href="/mlb/players" className="underline">
            /mlb/players
          </Link>
          .
        </p>
        <ol className="space-y-4">
          {STATCAST_4_FACTORS.map((factor, idx) => (
            <li
              key={factor.key}
              id={factor.key}
              className="rounded-xl bg-white dark:bg-[var(--color-surface-card)] border border-gray-200 dark:border-[var(--color-border)] p-4 space-y-2 scroll-mt-20"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-brand-700 dark:text-brand-100">
                  {idx + 11}. {factor.label}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 shrink-0 font-mono">
                  {weightPercent(MLB_BASE_WEIGHTS[factor.key])}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                카테고리: {factor.category} · range {factor.range}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{factor.description}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold">왜 중요한가:</span> {factor.why}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                출처: {factor.source}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3" aria-labelledby="bonus-heading">
        <h2
          id="bonus-heading"
          className="text-xl font-bold border-b border-gray-200 dark:border-[var(--color-border)] pb-2"
        >
          홈 어드밴티지 보너스
        </h2>
        <div
          id={HOME_BONUS.key}
          className="rounded-xl bg-amber-50/30 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/40 p-4 space-y-2 scroll-mt-20"
        >
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-amber-800 dark:text-amber-200">{HOME_BONUS.label}</h3>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 shrink-0 font-mono">
              {weightPercent(MLB_BASE_WEIGHTS.home_elo_bonus)}
            </span>
          </div>
          <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
            range {HOME_BONUS.range}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200">{HOME_BONUS.description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">왜 중요한가:</span> {HOME_BONUS.why}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            출처: {HOME_BONUS.source}
          </p>
        </div>
      </section>

      <footer className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-4 space-y-1">
        <p>
          ※ 본 가중치 = MLB v1.0 (KBO v1.8 매핑 + Statcast {STAT_N} 추가). 모델 진화 시 갱신.
        </p>
        <p>
          ※ 가중치 source: <code>packages/kbo-data/src/factors/mlb-base.ts</code>. Shadow C 학습 cohort = walk-forward expanding window (milestone n=27 / 60 / 150 / 300 / 1000 / 2430).
        </p>
        <p>
          ※ KBO 모델 = <Link href="/methodology" className="underline">/methodology</Link>. Statcast 팀별 측정 ={" "}
          <Link href="/mlb/players" className="underline">/mlb/players</Link>.
        </p>
      </footer>
    </main>
  );
}
