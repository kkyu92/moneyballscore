import type { Metadata } from "next";

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `${date} 승부예측`,
    description: `${date} KBO 경기 세이버메트릭스 기반 승부예측`,
  };
}

export default async function PredictionDatePage({ params }: Props) {
  const { date } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{date} 승부예측</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg">
          Phase 2에서 해당 날짜의 예측 카드가 표시됩니다.
        </p>
      </div>
    </div>
  );
}
