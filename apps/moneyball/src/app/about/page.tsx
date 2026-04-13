import type { Metadata } from "next";
import { DEFAULT_WEIGHTS } from "@moneyball/shared";

export const metadata: Metadata = {
  title: "소개",
  description:
    "MoneyBall KBO 승부예측 방법론. 세이버메트릭스 기반 7팩터 가중합산 모델.",
};

const FACTORS = [
  {
    name: "선발투수 FIP",
    key: "sp_fip" as const,
    desc: "Fielding Independent Pitching. 수비와 무관한 투수 순수 실력 지표. ERA보다 미래 성적 예측에 정확.",
  },
  {
    name: "타선 wOBA",
    key: "lineup_woba" as const,
    desc: "weighted On-Base Average. 단타/2루타/홈런 등 각 출루 방식에 가중치를 부여한 종합 타격 생산성.",
  },
  {
    name: "불펜 FIP",
    key: "bullpen_fip" as const,
    desc: "중계/마무리 투수진의 종합 FIP. 선발 강판 후 경기 결과에 큰 영향.",
  },
  {
    name: "최근 폼",
    key: "recent_form" as const,
    desc: "최근 10경기 승률. 시즌 전체 성적보다 현재 팀 상태를 반영.",
  },
  {
    name: "WAR",
    key: "war" as const,
    desc: "Wins Above Replacement. 대체 선수 대비 팀 승리 기여도 총합.",
  },
  {
    name: "상대전적",
    key: "head_to_head" as const,
    desc: "시즌 상대전적 승률. 특정 팀 간 상성이 존재할 수 있음.",
  },
  {
    name: "구장 보정",
    key: "park_factor" as const,
    desc: "홈구장 특성 보정. 타자 친화 구장과 투수 친화 구장의 차이를 반영.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <section>
        <h1 className="text-3xl font-bold mb-2">MoneyBall KBO</h1>
        <p className="text-gray-500 text-lg">
          세이버메트릭스 기반 KBO 프로야구 승부예측
        </p>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xl font-bold">예측 모델 v1.0</h2>
        <p className="text-gray-600">
          7개의 세이버메트릭스 팩터를 가중합산하여 각 경기의 승리 확률을
          산출합니다. 홈팀 어드밴티지(+3%)를 추가 반영하며, sigmoid 함수로
          최종 확률을 계산합니다.
        </p>

        <div className="space-y-4 mt-6">
          {FACTORS.map((factor) => (
            <div
              key={factor.key}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="text-right min-w-[50px]">
                <span className="text-xl font-bold text-blue-600">
                  {Math.round(DEFAULT_WEIGHTS[factor.key] * 100)}%
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{factor.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{factor.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-3">데이터 소스</h2>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            스탯티즈 (statiz.co.kr) — 세이버메트릭스 상세 지표
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            KBO 공식 사이트 — 경기 일정, 결과, 선발투수
          </li>
        </ul>
      </section>
    </div>
  );
}
