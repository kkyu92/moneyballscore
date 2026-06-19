/**
 * LLM Agent 표준 ContextPayload — plan #23 Step 3 (cycle 1227, 2026-06-19).
 *
 * Step 1 (MetricRegistry) + Step 2 (KBO_DOMAIN_KB) 결합 → 7 agent (postview / judge /
 * team / personas / debate / calibration / rivalry-memory) 가 공통 소비할 단일 구조화
 * context. 기존 `GameContext` (raw 데이터 fetch 결과) 를 한 번 변환 → 메트릭별 정의
 * 동봉 + 도메인 지식 hint 동봉 형태로 박제.
 *
 * 책임 분리:
 *   - 데이터 source = 호출자 책임 (GameContext 가 이미 fetch 한 데이터를 그대로 변환).
 *     본 모듈은 sync 변환만 — DB / API 호출 X.
 *   - metric 의미 / bounds = `MetricRegistry` 단일 source. 본 모듈은 reference 만 동봉.
 *   - 구장 / 시즌 / 라이벌리 hint = `KBO_DOMAIN_KB` render helper 재사용. drift X.
 *   - LLM hallucination catch = `isMetricValueValid` 호출 가능 (slug + value pair).
 *
 * Step 4 (회귀 가드) = 본 모듈을 7 agent 가 실제 소비한 후 pre/post Brier delta 측정.
 */

import type { TeamCode } from '@moneyball/shared';
import type { GameContext } from '../agents/types';
import { renderParkForLLM, renderRivalryForLLM, renderSeasonForLLM, renderTimeWindowsForLLM, KBO_PARKS, TIME_WINDOWS, type ParkContext } from './domain';
import { MetricRegistry, type MetricDefinition, type MetricSlug } from './metrics';

/**
 * 단일 metric 의 게임별 측정치 + 정의 묶음.
 *
 * `metric` 은 `MetricRegistry` 의 reference — 변경 X (Readonly). LLM 이 본 객체
 * 단위로 metric 의미 + 측정치를 한 번에 소비.
 */
export interface MetricObservation {
  /** 홈팀 측정치 (단위 = `metric.unit`). */
  home: number;
  /** 원정팀 측정치. */
  away: number;
  /** Metric 정의 (의미 / 단위 / bounds). */
  metric: Readonly<MetricDefinition>;
}

/** AgentContext 안 게임 메타데이터. */
export interface AgentGameMeta {
  /** 외부 KBO 게임 ID (`ScrapedGame.externalGameId`). */
  external_game_id: string;
  /** 경기 일자 (YYYY-MM-DD, KST). */
  date: string;
  /** 경기 시각 (HH:MM, KST). */
  time: string;
  home_team: TeamCode;
  away_team: TeamCode;
  /** 홈 선발 투수 이름 (미확정 시 null). */
  home_sp: string | null;
  away_sp: string | null;
}

/**
 * LLM Agent 표준 ContextPayload — 7 agent 공통 input.
 *
 * 기존 inline prompt 안 `KBO_TEAMS` / `DEFAULT_WEIGHTS` / glossary 흩어진 참조를 본
 * payload 단일 source 로 통합. agent 별 prompt builder 는 본 payload 를 input 으로
 * `renderContextForLLM` 호출 → 표준 prompt 문자열 박제.
 */
export interface AgentContext {
  game: AgentGameMeta;
  /** Metric slug → 게임별 측정치 + 정의. production weight>0 metric 만 박제. */
  metrics: Partial<Record<MetricSlug, MetricObservation>>;
  /** 홈팀 최근 폼 (0~1 비율, `TIME_WINDOWS.recent_form` 기준). */
  home_recent_form: number;
  away_recent_form: number;
  /**
   * 상대 전적 (`TIME_WINDOWS.h2h_window` 기준). `home_wins + away_wins = total`.
   * 데이터 부재 시 total=0.
   */
  h2h: { home_wins: number; away_wins: number; total: number };
  /** 홈 구장 context (`KBO_PARKS[home_team]`). */
  park: ParkContext;
  /**
   * LLM prompt 안 한 줄씩 그대로 삽입 가능한 도메인 hint 배열.
   * 라이벌리 X 시 라이벌리 hint 자동 제외 (null 필터).
   */
  domain_hints: ReadonlyArray<string>;
}

/**
 * `GameContext` → `AgentContext` sync 변환.
 *
 * 입력 데이터는 호출자가 이미 fetch — 본 함수는 LLM 친화 형태로 재구성 + metric
 * 정의 동봉만 한다.
 *
 * Metric source-of-truth:
 *   - sp_fip / sp_xfip: `homeSPStats` / `awaySPStats` (null 시 metric skip)
 *   - lineup_woba / bullpen_fip / war / sfr: `homeTeamStats` / `awayTeamStats`
 *   - recent_form: `home/awayRecentForm` (0~1) → percent (0~100) 환산
 *   - head_to_head: `headToHead.wins/losses` → home 승률 percent
 *   - park_factor: `parkFactor` (양 팀 동일 — 같은 구장)
 *   - elo: `homeElo` / `awayElo`
 *   - park_weather / umpire_sz: shadow-only (production weight=0) — 본 변환 skip
 */
export function buildAgentContext(ctx: GameContext, today: Date = new Date()): AgentContext {
  const metrics: Partial<Record<MetricSlug, MetricObservation>> = {};

  if (ctx.homeSPStats && ctx.awaySPStats) {
    metrics.sp_fip = {
      home: ctx.homeSPStats.fip,
      away: ctx.awaySPStats.fip,
      metric: MetricRegistry.sp_fip,
    };
    metrics.sp_xfip = {
      home: ctx.homeSPStats.xfip,
      away: ctx.awaySPStats.xfip,
      metric: MetricRegistry.sp_xfip,
    };
  }

  metrics.lineup_woba = {
    home: ctx.homeTeamStats.woba,
    away: ctx.awayTeamStats.woba,
    metric: MetricRegistry.lineup_woba,
  };
  metrics.bullpen_fip = {
    home: ctx.homeTeamStats.bullpenFip,
    away: ctx.awayTeamStats.bullpenFip,
    metric: MetricRegistry.bullpen_fip,
  };
  metrics.war = {
    home: ctx.homeTeamStats.totalWar,
    away: ctx.awayTeamStats.totalWar,
    metric: MetricRegistry.war,
  };
  metrics.sfr = {
    home: ctx.homeTeamStats.sfr,
    away: ctx.awayTeamStats.sfr,
    metric: MetricRegistry.sfr,
  };

  metrics.recent_form = {
    home: Number((ctx.homeRecentForm * 100).toFixed(1)),
    away: Number((ctx.awayRecentForm * 100).toFixed(1)),
    metric: MetricRegistry.recent_form,
  };

  const h2hTotal = ctx.headToHead.wins + ctx.headToHead.losses;
  const h2hHomeWinPct = h2hTotal > 0 ? Number(((ctx.headToHead.wins / h2hTotal) * 100).toFixed(1)) : 50.0;
  metrics.head_to_head = {
    home: h2hHomeWinPct,
    away: Number((100 - h2hHomeWinPct).toFixed(1)),
    metric: MetricRegistry.head_to_head,
  };

  metrics.park_factor = {
    home: ctx.parkFactor,
    away: ctx.parkFactor,
    metric: MetricRegistry.park_factor,
  };

  metrics.elo = {
    home: ctx.homeElo.elo,
    away: ctx.awayElo.elo,
    metric: MetricRegistry.elo,
  };

  const park = KBO_PARKS[ctx.game.homeTeam];
  const hints: string[] = [];
  hints.push(renderParkForLLM(ctx.game.homeTeam));
  const rivalryHint = renderRivalryForLLM(ctx.game.homeTeam, ctx.game.awayTeam);
  if (rivalryHint) hints.push(rivalryHint);
  hints.push(renderSeasonForLLM(today));
  hints.push(renderTimeWindowsForLLM());

  return {
    game: {
      external_game_id: ctx.game.externalGameId,
      date: ctx.game.date,
      time: ctx.game.gameTime,
      home_team: ctx.game.homeTeam,
      away_team: ctx.game.awayTeam,
      home_sp: ctx.game.homeSP ?? null,
      away_sp: ctx.game.awaySP ?? null,
    },
    metrics,
    home_recent_form: ctx.homeRecentForm,
    away_recent_form: ctx.awayRecentForm,
    h2h: {
      home_wins: ctx.headToHead.wins,
      away_wins: ctx.headToHead.losses,
      total: h2hTotal,
    },
    park,
    domain_hints: Object.freeze(hints),
  };
}

function formatMetricLine(slug: MetricSlug, obs: MetricObservation): string {
  const m = obs.metric;
  const fmt = (v: number) => (m.unit === 'percent' ? `${v.toFixed(1)}%` : m.unit === 'elo' || m.unit === 'count' ? v.toFixed(0) : v.toFixed(3));
  const dirKo = m.direction === 'lower-better' ? '↓' : '↑';
  return `  - ${m.ko_name} (${slug}): 홈 ${fmt(obs.home)} / 원정 ${fmt(obs.away)} [${dirKo} 우수, 가중치 ${(m.weight_v18 * 100).toFixed(1)}%]`;
}

/**
 * AgentContext → LLM prompt 안 직접 삽입 가능한 문자열 박제.
 *
 * 구성:
 *   - 게임 메타 (날짜 / 시간 / 팀 / 선발)
 *   - 도메인 hint 4종 (구장 / 라이벌리 / 시즌 / 시간 윈도우)
 *   - production metric 측정치 + 정의 (10팩터 한 줄씩)
 *   - 최근 폼 + 상대 전적 (raw 숫자 형태)
 *
 * Token budget: 약 800~1200 tokens (한국어 기준). max ±20% budget 안 (plan #23
 * Step 4 회귀 가드 임계).
 */
export function renderContextForLLM(ac: AgentContext): string {
  const lines: string[] = [];

  lines.push(`[경기] ${ac.game.date} ${ac.game.time} — ${ac.game.home_team}(홈) vs ${ac.game.away_team}(원정)`);
  lines.push(`  선발: ${ac.game.home_sp ?? '미정'} (홈) / ${ac.game.away_sp ?? '미정'} (원정)`);
  lines.push('');

  lines.push('[도메인 컨텍스트]');
  for (const hint of ac.domain_hints) lines.push(`  - ${hint}`);
  lines.push('');

  lines.push('[정량 메트릭 — 10팩터]');
  for (const slug of Object.keys(ac.metrics) as MetricSlug[]) {
    const obs = ac.metrics[slug];
    if (!obs) continue;
    lines.push(formatMetricLine(slug, obs));
  }
  lines.push('');

  lines.push('[상대 전적 + 최근 폼]');
  lines.push(`  - H2H (${TIME_WINDOWS.h2h_window.ko}): 홈 ${ac.h2h.home_wins}승 / 원정 ${ac.h2h.away_wins}승 (총 ${ac.h2h.total}경기)`);
  lines.push(`  - 최근 폼 (${TIME_WINDOWS.recent_form.ko}): 홈 ${(ac.home_recent_form * 100).toFixed(1)}% / 원정 ${(ac.away_recent_form * 100).toFixed(1)}%`);

  return lines.join('\n');
}
