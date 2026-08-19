import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { loadAllPicks, loadAllWinners } from "@/lib/lotto/combo-check-data";
import { ComboCheckClient } from "./ComboCheckClient";
import { SITE_URL } from "@moneyball/shared";

export const dynamic = "force-static";
export const revalidate = 3600;   // ISR — pick md 신규 반영 최대 1h

export const metadata: Metadata = {
  title: "로또 조합 검증 — 우리 예측 + 역대 1등 중복 판별 | Moneyball",
  description: "6개 번호 입력 시 우리가 예측한 전체 조합 중 포함 여부 + 역대 1등 조합 매칭 여부를 즉시 확인.",
  alternates: { canonical: `${SITE_URL}/lotto/check` },
  openGraph: {
    url: `${SITE_URL}/lotto/check`,
    title: "로또 조합 검증 — 우리 예측 + 역대 1등 중복 판별",
    description: "6개 번호 입력 시 우리 예측 조합 및 역대 1등 매칭 여부 즉시 확인.",
  },
};

export default function LottoCheckPage() {
  const { keys, picksByFile, totalSets } = loadAllPicks();
  const { keyToRound } = loadAllWinners();

  // 클라이언트 전달용 축소 (winnersMap = round/date/bonus만)
  const winnersMap: Record<string, { round: number; date: string; bonus: number }> = {};
  for (const [k, v] of Object.entries(keyToRound)) {
    winnersMap[k] = { round: v.round, date: v.date, bonus: v.bonus };
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <Breadcrumb items={[{ label: "로또 통계 분석", href: "/lotto" }, { label: "조합 검증" }]} className="mb-2" />

      <section className="space-y-3">
        <h1 className="text-2xl font-bold">조합 검증</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          6개 번호 (1-45) 를 입력하면 <strong>우리가 매주 예측한 전체 조합</strong>과{" "}
          <strong>역대 1등 당첨 번호</strong> 두 데이터셋에서 중복 여부를 즉시 판별합니다.
          우리 예측은 매주 신규 세트가 자동으로 반영됩니다.
        </p>
      </section>

      <ComboCheckClient
        pickKeys={keys}
        picksByFile={picksByFile}
        winnersMap={winnersMap}
        totalPickSets={totalSets}
        totalWinners={Object.keys(keyToRound).length}
      />

      <section className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed space-y-2 pt-4">
        <p>
          <strong>우리 예측 조합</strong>: 매주 토요일 추첨 대상 회차별로 생성한 상위 조합 전체. 재활용 차단 로직으로 주차간 중복 자동 제거.
        </p>
        <p>
          <strong>역대 1등 조합</strong>: 로또 6/45 1회부터 최신 회차까지의 실제 1등 번호 전체.
        </p>
        <p>
          두 데이터 매칭 결과는 통계 학습 참고용 — <strong>당첨 확률과 무관</strong>합니다.{" "}
          <Link href="/lotto/methodology" className="underline hover:text-gray-700">
            방법론 →
          </Link>
        </p>
      </section>
    </main>
  );
}
