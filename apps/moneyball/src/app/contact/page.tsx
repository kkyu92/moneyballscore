import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const metadata: Metadata = {
  title: "문의",
  description:
    "MoneyBall Score 문의 및 제보. 데이터 오류 신고, 예측 관련 질문, 협업·제휴 제안, 개인정보 관련 요청.",
  robots: { index: true, follow: true },
};

const INQUIRY_TYPES = [
  {
    label: "데이터 오류 신고",
    desc: "스탯·선발·결과·적중률 등 수치가 공식 기록과 다를 때. 경기 날짜와 팀 이름을 함께 적어주시면 확인이 빠릅니다.",
    prefill: "[데이터 오류] ",
  },
  {
    label: "예측 해석 문의",
    desc: "특정 경기 예측의 근거, 팩터 가중치, 에이전트 토론 내용에 대한 질문.",
    prefill: "[예측 문의] ",
  },
  {
    label: "협업·제휴",
    desc: "매체 인용, 데이터 공유, 공동 프로젝트 제안 등.",
    prefill: "[제휴] ",
  },
  {
    label: "개인정보 요청",
    desc: "개인정보처리방침 관련 질문. 본 서비스는 회원 개인정보를 저장하지 않지만, 관련 문의는 언제든 환영합니다.",
    prefill: "[개인정보] ",
  },
  {
    label: "기타",
    desc: "위에 해당하지 않는 모든 문의. 운영 관련 제안도 환영합니다.",
    prefill: "[기타] ",
  },
];

const EMAIL = "moneyballscore777@gmail.com";

export default function ContactPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <Breadcrumb items={[{ label: "문의" }]} className="mb-2" />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">문의</h1>
        <p className="text-gray-600 dark:text-gray-300">
          MoneyBall Score에 대한 모든 문의는 아래 이메일로 받습니다. 보통 영업일
          기준 2~3일 이내 답변 드립니다.
        </p>
      </header>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          연락 이메일
        </h2>
        <a
          href={`mailto:${EMAIL}`}
          className="text-2xl font-bold text-brand-500 hover:underline break-all"
        >
          {EMAIL}
        </a>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          이메일 외 별도의 문의 채널은 운영하지 않습니다. SNS DM·댓글 등을 통한
          문의는 확인이 늦을 수 있습니다.
        </p>
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-4">
        <h2 className="text-xl font-bold">문의 유형</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          아래 링크를 누르면 이메일 앱이 해당 유형의 제목으로 미리 채워집니다.
        </p>
        <ul className="space-y-3 mt-2">
          {INQUIRY_TYPES.map((t) => (
            <li
              key={t.label}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 bg-surface rounded-lg"
            >
              <div className="flex-1">
                <h3 className="font-semibold">{t.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t.desc}
                </p>
              </div>
              <a
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(t.prefill)}`}
                className="shrink-0 text-sm px-3 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 transition-colors text-center"
              >
                메일 쓰기
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-3">
        <h2 className="text-xl font-bold">문의 전 확인해주세요</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>
            예측 방법론은{" "}
            <Link href="/about" className="text-brand-500 hover:underline">
              소개 페이지
            </Link>
            에 팩터별 가중치와 데이터 출처까지 공개되어 있습니다.
          </li>
          <li>
            누적 적중률과 팩터별 오답 분석은{" "}
            <Link href="/dashboard" className="text-brand-500 hover:underline">
              대시보드
            </Link>
            에서 실시간으로 확인할 수 있습니다.
          </li>
          <li>
            본 서비스는 스포츠 토토·베팅 관련 정보를 제공하지 않으며, 해당
            유형의 문의에는 답변드리지 않습니다. 자세한 내용은{" "}
            <Link href="/terms" className="text-brand-500 hover:underline">
              이용약관
            </Link>
            을 참고해주세요.
          </li>
        </ul>
      </section>

      <footer className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
        관련 문서:{" "}
        <Link href="/privacy" className="text-brand-500 hover:underline">
          개인정보처리방침
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="text-brand-500 hover:underline">
          이용약관
        </Link>
      </footer>
    </article>
  );
}
