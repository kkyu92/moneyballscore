import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const metadata: Metadata = {
  title: "이용약관",
  description:
    "MoneyBall Score 이용약관. 서비스 성격, 면책, 예측 정확성 무보증, 스포츠 베팅 관련 고지, 분쟁 해결 조항.",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    id: "purpose",
    title: "제1조 (목적)",
    body: (
      <p>
        본 약관은 이용자가 MoneyBall Score(이하 &ldquo;본 서비스&rdquo;)를
        이용함에 있어 필요한 이용 조건, 면책 사항 및 기타 필요 사항을 규정함을
        목적으로 합니다.
      </p>
    ),
  },
  {
    id: "nature",
    title: "제2조 (서비스의 성격)",
    body: (
      <>
        <p>
          본 서비스는 KBO 리그 경기를 대상으로 세이버메트릭스 지표와 AI 에이전트
          토론 모델을 결합하여 산출한 승부 예측 및 해석을 제공합니다. 본 서비스의
          예측은 다음의 성격을 가집니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>정보 제공 및 연구·교육 목적의 통계 해설입니다.</li>
          <li>
            실제 경기 결과와 일치함을 보장하지 않으며, 어떠한 경제적 이익도
            보증하지 않습니다.
          </li>
          <li>
            스포츠 토토, 사설 도박, 베팅, 투자 상품 등 금전적 거래의 권유 또는
            조장 목적이 아닙니다.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "no-betting",
    title: "제3조 (스포츠 베팅 관련 고지)",
    body: (
      <>
        <p>
          대한민국에서는 국민체육진흥법에 따라 공인 스포츠 토토 외의 모든 사설
          베팅이 금지되어 있습니다. 본 서비스는 사설 도박의 홍보, 매개, 조장과
          일체 관련이 없으며, 본 서비스의 정보를 이용한 베팅 행위에 대하여 운영자는
          어떠한 법적 책임도 부담하지 않습니다.
        </p>
        <p className="mt-3">
          이용자는 본 서비스의 예측이 경기 해석의 한 관점일 뿐임을 인식하고, 이를
          근거로 금전을 거는 행위로 인해 발생하는 모든 결과에 대한 책임을 스스로
          집니다.
        </p>
      </>
    ),
  },
  {
    id: "accuracy",
    title: "제4조 (예측 정확성에 대한 면책)",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          본 서비스가 제공하는 승부 예측은 공개된 통계와 확률 모델에 기반한 것이며,
          그 정확성·완전성·적시성을 보장하지 않습니다.
        </li>
        <li>
          이용자가 본 서비스의 예측을 신뢰하여 취한 어떠한 행동으로 인해 발생하는
          직간접적 손해에 대해 운영자는 책임을 지지 않습니다.
        </li>
        <li>
          경기 일정, 선수 컨디션, 기록의 수집 오류 등으로 인한 예측 오차가 발생할
          수 있음을 이용자는 이해하고 동의합니다.
        </li>
      </ul>
    ),
  },
  {
    id: "ip",
    title: "제5조 (지적 재산권)",
    body: (
      <>
        <p>
          본 서비스가 게시하는 예측 본문, 해설, 시각화, 디자인, 코드, AI 생성
          텍스트 등 모든 콘텐츠에 대한 저작권은 본 서비스 운영자에게 귀속됩니다.
        </p>
        <p className="mt-3">
          원문 데이터(경기 기록, 선수 스탯 등)의 저작권은 해당 데이터 출처
          제공자에게 귀속되며, 본 서비스는 정보 제공 목적의 공개 자료 수집 범위
          내에서만 이용합니다.
        </p>
        <p className="mt-3">
          이용자는 본 서비스의 콘텐츠를 출처 표기 없이 상업적으로 재배포하거나
          대량 크롤링할 수 없습니다. 개인적·비영리적 범위 내의 인용 및 공유는
          허용됩니다.
        </p>
      </>
    ),
  },
  {
    id: "prohibited",
    title: "제6조 (이용자의 금지 행위)",
    body: (
      <p>
        이용자는 본 서비스를 이용함에 있어 다음의 행위를 하여서는 안 됩니다.
        <br />
        (1) 자동화된 수단으로 서비스에 과도한 부하를 유발하는 행위.
        <br />
        (2) 본 서비스의 콘텐츠를 무단 복제하여 도박성 사이트에 게시하는 행위.
        <br />
        (3) 본 서비스를 사설 도박, 불법 투자 유인, 기타 법령 위반 행위에
        이용하는 행위.
        <br />
        (4) 본 서비스의 운영을 방해하거나, 운영자 또는 제3자의 명예를 훼손하는
        행위.
      </p>
    ),
  },
  {
    id: "availability",
    title: "제7조 (서비스의 변경 및 중단)",
    body: (
      <p>
        운영자는 안정적인 서비스 제공을 위해 사전 공지 없이 서비스의 일부 또는
        전부를 변경·중단할 수 있습니다. 본 서비스는 무료로 제공되며, 서비스의
        중단으로 인해 이용자에게 발생한 손해에 대하여 어떠한 보상도 부담하지
        않습니다.
      </p>
    ),
  },
  {
    id: "liability",
    title: "제8조 (책임의 제한)",
    body: (
      <p>
        본 서비스는 &ldquo;있는 그대로(AS IS)&rdquo; 제공되며, 상품성·특정 목적
        적합성·정확성·비침해성 등에 대한 명시적 또는 묵시적 보증을 일체 하지
        않습니다. 관련 법령이 허용하는 최대 범위 내에서 운영자는 본 서비스의
        이용과 관련한 어떠한 직·간접·부수적·결과적 손해에 대해서도 책임을 지지
        않습니다.
      </p>
    ),
  },
  {
    id: "law",
    title: "제9조 (준거법 및 분쟁 해결)",
    body: (
      <p>
        본 약관의 해석 및 본 서비스 이용과 관련하여 발생한 분쟁에는 대한민국
        법률을 적용합니다. 이용자와 운영자 간의 분쟁은 원칙적으로 이메일을 통한
        상호 협의로 해결하며, 협의가 이루어지지 않을 경우 민사소송법상의 관할
        법원을 제1심 관할 법원으로 합니다.
      </p>
    ),
  },
  {
    id: "changes",
    title: "제10조 (약관의 변경)",
    body: (
      <p>
        본 약관은 법령이나 서비스 정책의 변경에 따라 개정될 수 있으며, 변경 시
        개정된 약관의 시행일 및 최종 개정일을 본 페이지 상단에 공지합니다.
        이용자가 개정 약관의 시행일 이후 본 서비스를 계속 이용하는 경우 개정
        약관에 동의한 것으로 봅니다.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <Breadcrumb items={[{ label: "이용약관" }]} className="mb-2" />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">이용약관</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          시행일: 2026-04-17 · 최종 개정: 2026-04-17
        </p>
        <p className="text-gray-600 dark:text-gray-300 pt-2">
          본 약관은 MoneyBall Score 이용과 관련한 권리·의무 및 면책 사항을
          규정합니다.
        </p>
      </header>

      <nav
        aria-label="목차"
        className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-4"
      >
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
          목차
        </h2>
        <ol className="text-sm space-y-1">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="hover:text-brand-500 transition-colors">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-6">
        {SECTIONS.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-3"
          >
            <h2 className="text-lg font-bold">{s.title}</h2>
            <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {s.body}
            </div>
          </section>
        ))}
      </div>

      <footer className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
        관련 문서:{" "}
        <Link href="/privacy" className="text-brand-500 hover:underline">
          개인정보처리방침
        </Link>{" "}
        ·{" "}
        <Link href="/contact" className="text-brand-500 hover:underline">
          문의
        </Link>
      </footer>
    </article>
  );
}
