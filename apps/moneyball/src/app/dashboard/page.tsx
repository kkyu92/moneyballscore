import type { Metadata } from "next";
import { AccuracySummary } from "@/components/dashboard/AccuracySummary";

export const metadata: Metadata = {
  title: "대시보드",
  description: "KBO 승부예측 시즌 적중률, 팀별 분석, 모델 성과 대시보드.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-gray-500">2026 시즌 예측 성과 종합</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AccuracySummary total={0} correct={0} rate={0} highConfRate={0} />
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">총 예측</h3>
          <span className="text-4xl font-bold">0</span>
          <span className="text-sm text-gray-500 ml-1">경기</span>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">발행 포스트</h3>
          <span className="text-4xl font-bold">0</span>
          <span className="text-sm text-gray-500 ml-1">개</span>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg">Phase 3에서 상세 차트가 추가됩니다.</p>
        <p className="text-sm mt-2">
          적중률 추이, 팀별 성과, 월별 히트맵, 모델 버전 비교
        </p>
      </section>
    </div>
  );
}
