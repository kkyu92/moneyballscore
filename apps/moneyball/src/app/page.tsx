import { PredictionCard } from "@/components/predictions/PredictionCard";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";
import { toKSTDisplayString, type TeamCode } from "@moneyball/shared";
import Link from "next/link";

// Phase 1: 정적 샘플 데이터 (Phase 2에서 Supabase 연동)
const SAMPLE_PREDICTIONS = [
  {
    homeTeam: "LGT" as TeamCode,
    awayTeam: "DSB" as TeamCode,
    confidence: 0.68,
    predictedWinner: "LGT" as TeamCode,
    homeSPName: "임찬규",
    awaySPName: "곽빈",
    homeSPFip: 3.12,
    awaySPFip: 4.45,
    homeWoba: 0.345,
    awayWoba: 0.298,
    gameTime: "18:30",
  },
  {
    homeTeam: "KIA" as TeamCode,
    awayTeam: "SSG" as TeamCode,
    confidence: 0.62,
    predictedWinner: "KIA" as TeamCode,
    homeSPName: "양현종",
    awaySPName: "김광현",
    homeSPFip: 3.45,
    awaySPFip: 3.78,
    homeWoba: 0.332,
    awayWoba: 0.31,
    gameTime: "18:30",
  },
  {
    homeTeam: "SSA" as TeamCode,
    awayTeam: "HHE" as TeamCode,
    confidence: 0.55,
    predictedWinner: "SSA" as TeamCode,
    homeSPName: "원태인",
    awaySPName: "문동주",
    homeSPFip: 3.65,
    awaySPFip: 3.82,
    homeWoba: 0.315,
    awayWoba: 0.305,
    gameTime: "18:30",
  },
  {
    homeTeam: "NCB" as TeamCode,
    awayTeam: "KTW" as TeamCode,
    confidence: 0.58,
    predictedWinner: "NCB" as TeamCode,
    homeSPName: "루친스키",
    awaySPName: "소형준",
    homeSPFip: 3.2,
    awaySPFip: 4.1,
    homeWoba: 0.328,
    awayWoba: 0.312,
    gameTime: "18:30",
  },
  {
    homeTeam: "LOT" as TeamCode,
    awayTeam: "KIW" as TeamCode,
    confidence: 0.52,
    predictedWinner: "KIW" as TeamCode,
    homeSPName: "나균안",
    awaySPName: "안우진",
    homeSPFip: 4.32,
    awaySPFip: 2.95,
    homeWoba: 0.308,
    awayWoba: 0.34,
    gameTime: "18:30",
  },
];

export default function HomePage() {
  const today = toKSTDisplayString();

  return (
    <div className="space-y-8">
      {/* 히어로 섹션 */}
      <section>
        <h1 className="text-3xl font-bold mb-2">오늘의 승부예측</h1>
        <p className="text-gray-500">
          {today} KBO 경기 세이버메트릭스 기반 분석
        </p>
      </section>

      {/* 적중률 요약 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AccuracySummary total={0} correct={0} rate={0} highConfRate={0} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">
            오늘 경기 수
          </h3>
          <span className="text-4xl font-bold">
            {SAMPLE_PREDICTIONS.length}
          </span>
          <span className="text-sm text-gray-500 ml-1">경기</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">모델 버전</h3>
          <span className="text-4xl font-bold">v1.0</span>
          <p className="text-xs text-gray-500 mt-2">7팩터 가중합산</p>
        </div>
      </section>

      {/* 예측 카드 목록 */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">경기별 예측</h2>
          <Link
            href="/predictions"
            className="text-sm text-blue-600 hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SAMPLE_PREDICTIONS.map((pred, i) => (
            <PredictionCard key={i} {...pred} />
          ))}
        </div>
      </section>

      {/* 방법론 소개 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold mb-3">분석 방법론</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: "선발 FIP", weight: "25%", desc: "투수 실력 지표" },
            { label: "타선 wOBA", weight: "20%", desc: "타격 생산성" },
            { label: "불펜 FIP", weight: "15%", desc: "중계/마무리" },
            { label: "최근 폼", weight: "15%", desc: "최근 10경기" },
          ].map((item) => (
            <div key={item.label} className="p-3">
              <p className="text-2xl font-bold text-blue-600">{item.weight}</p>
              <p className="text-sm font-medium mt-1">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
