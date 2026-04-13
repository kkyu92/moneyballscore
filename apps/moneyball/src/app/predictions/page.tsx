import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "예측 기록",
  description: "KBO 승부예측 기록. 날짜별 세이버메트릭스 기반 경기 분석.",
};

export default function PredictionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">예측 기록</h1>
      <p className="text-gray-500">날짜별 승부예측 기록입니다.</p>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg">Phase 2에서 날짜별 예측 목록이 표시됩니다.</p>
        <p className="text-sm mt-2">
          Supabase 연동 후 자동으로 데이터가 채워집니다.
        </p>
      </div>
    </div>
  );
}
