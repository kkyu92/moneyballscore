import type { Metadata } from "next";
import { DEFAULT_WEIGHTS } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "소개",
  description:
    "MoneyBall KBO 승부예측 방법론. 세이버메트릭스 기반 10팩터 3소스 가중합산 모델 v1.5.",
};

const FACTORS = [
  {
    name: "선발투수 FIP",
    key: "sp_fip" as const,
    desc: "Fielding Independent Pitching. 수비와 무관한 투수 순수 실력 지표. ERA보다 미래 성적 예측에 정확.",
    source: "Fancy Stats",
  },
  {
    name: "선발투수 xFIP",
    key: "sp_xfip" as const,
    desc: "Expected FIP. 홈런율을 리그 평균으로 정규화한 FIP. 운의 영향을 제거.",
    source: "Fancy Stats",
  },
  {
    name: "타선 wOBA",
    key: "lineup_woba" as const,
    desc: "weighted On-Base Average. 단타/2루타/홈런 등 각 출루 방식에 가중치를 부여한 종합 타격 생산성.",
    source: "Fancy Stats",
  },
  {
    name: "불펜 FIP",
    key: "bullpen_fip" as const,
    desc: "중계/마무리 투수진의 종합 FIP. 선발 강판 후 경기 결과에 큰 영향.",
    source: "Fancy Stats",
  },
  {
    name: "최근 폼",
    key: "recent_form" as const,
    desc: "최근 10경기 승률. 시즌 전체 성적보다 현재 팀 상태를 반영.",
    source: "KBO 공식",
  },
  {
    name: "Elo 레이팅",
    key: "elo" as const,
    desc: "체스에서 유래한 상대적 전력 수치. 강팀을 이기면 많이 오르고, 약팀에 지면 많이 내려감.",
    source: "Fancy Stats",
  },
  {
    name: "WAR",
    key: "war" as const,
    desc: "Wins Above Replacement. 대체 선수 대비 팀 승리 기여도 총합.",
    source: "Fancy Stats",
  },
  {
    name: "수비 SFR",
    key: "sfr" as const,
    desc: "Statcast Fielding Runs. 포지션별 수비 기여도 합산. 수비력이 실점에 미치는 영향.",
    source: "Fancy Stats",
  },
  {
    name: "상대전적",
    key: "head_to_head" as const,
    desc: "시즌 상대전적 승률. 특정 팀 간 상성이 존재할 수 있음.",
    source: "KBO 공식",
  },
  {
    name: "구장 보정",
    key: "park_factor" as const,
    desc: "홈구장 특성 보정. 타자 친화 구장과 투수 친화 구장의 차이를 반영.",
    source: "KBO 공식",
  },
];

const DATA_SOURCES = [
  {
    name: "KBO 공식",
    url: "koreabaseball.com",
    desc: "경기일정, 선발확정, 결과, 최근폼, 상대전적, 구장별 기록",
    color: "bg-brand-500",
  },
  {
    name: "KBO Fancy Stats",
    url: "kbofancystats.com",
    desc: "FIP, xFIP, WAR, wOBA, SFR, Elo 레이팅 (robots.txt 제한 없음)",
    color: "bg-accent",
  },
  {
    name: "FanGraphs",
    url: "fangraphs.com",
    desc: "wRC+, ISO, BB%/K% (보조 검증용)",
    color: "bg-brand-300",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <section>
        <h1 className="text-3xl font-bold mb-2">MoneyBall KBO</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          세이버메트릭스 기반 KBO 프로야구 승부예측
        </p>
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">예측 모델 v1.5</h2>
          <span className="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded-full font-medium">
            10팩터 3소스
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          10개의 세이버메트릭스 팩터를 3개 데이터 소스에서 수집하여 가중합산합니다.
          홈팀 어드밴티지(+3%)를 추가 반영하며, 각 팩터를 상대 비교로 정규화한 후
          최종 승리 확률을 산출합니다.
        </p>

        <div className="space-y-3 mt-6">
          {FACTORS.map((factor) => (
            <div
              key={factor.key}
              className="flex items-start gap-4 p-4 bg-surface rounded-lg"
            >
              <div className="text-right min-w-[50px]">
                <span className="text-xl font-bold text-brand-600">
                  {Math.round(DEFAULT_WEIGHTS[factor.key] * 100)}%
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{factor.name}</h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{factor.source}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{factor.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
          + 홈어드밴티지 3%. v2.0은 50경기 축적 후 오차분석 기반으로 업그레이드 예정.
        </p>
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-4">데이터 소스</h2>
        <div className="space-y-3">
          {DATA_SOURCES.map((source) => (
            <div key={source.name} className="flex items-start gap-3">
              <span className={`w-2 h-2 mt-2 ${source.color} rounded-full shrink-0`} />
              <div>
                <span className="font-medium">{source.name}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">({source.url})</span>
                <p className="text-sm text-gray-600 dark:text-gray-300">{source.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-3">업데이트 주기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">매일 15:00 KST</p>
            <p className="text-gray-500 dark:text-gray-400">선발 확정 + 예측 생성</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">매일 23:00 KST</p>
            <p className="text-gray-500 dark:text-gray-400">경기 결과 + 적중률 업데이트</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">경기 중 10분 간격</p>
            <p className="text-gray-500 dark:text-gray-400">이닝별 승리확률 보정</p>
          </div>
          <div className="p-3 bg-surface rounded-lg">
            <p className="font-medium">Telegram 알림</p>
            <p className="text-gray-500 dark:text-gray-400">예측 생성 + 결과 자동 발송</p>
          </div>
        </div>
      </section>
    </div>
  );
}
