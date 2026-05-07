import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "MoneyBall Score의 개인정보 수집·이용·보관에 관한 방침. 방문자 통계 수집 범위, 제3자 서비스 고지, 쿠키 사용 내역.",
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    id: "scope",
    title: "1. 수집하는 정보",
    body: (
      <>
        <p>
          MoneyBall Score는 회원가입, 로그인, 결제, 댓글, 개인 식별 정보 입력이
          필요한 어떠한 기능도 제공하지 않습니다. 서비스 운영 목적으로 다음의
          최소 범위 기술 정보만을 수집합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            방문 페이지 URL, 레퍼러, 대략적인 지리 정보(국가·지역), 브라우저 및
            OS 종류, 스크린 해상도 — Vercel Analytics를 통해 집계되며, 개인을
            식별할 수 있는 형태로 저장되지 않습니다.
          </li>
          <li>
            서버 접근 로그: IP 주소, 요청 경로, 응답 코드, 타임스탬프 — Vercel
            인프라 수준의 일반 로그이며, 보안 및 장애 대응 목적으로 30일 이내
            자동 폐기됩니다.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "purpose",
    title: "2. 수집 목적",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>서비스 품질 개선을 위한 방문자 행동 통계 분석</li>
        <li>서버 장애·부정 접근 탐지 및 대응</li>
        <li>향후 광고 서비스(Google AdSense) 도입 시 광고 품질 향상</li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "3. 쿠키 사용",
    body: (
      <>
        <p>
          MoneyBall Score 자체는 쿠키를 설정하지 않습니다. 다만 아래의 제3자
          서비스가 자체 정책에 따라 쿠키 또는 유사 기술을 사용할 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Vercel Analytics</strong> — 쿠키를 사용하지 않는 방문자
            집계 도구. 개인 식별자 없이 해시 기반으로 방문 단위를 추정합니다.
          </li>
          <li>
            <strong>Google AdSense</strong> (도입 예정) — 승인 후 관심 기반
            광고 노출을 위해 쿠키(DoubleClick, IDE 등)를 설정할 수 있습니다.
            사용자는{" "}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              Google 광고 설정
            </a>
            에서 언제든 맞춤 광고를 거부할 수 있으며,{" "}
            <a
              href="https://www.aboutads.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              aboutads.info
            </a>
            에서도 옵트아웃이 가능합니다.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "third-party",
    title: "4. 제3자 서비스 및 데이터 출처",
    body: (
      <>
        <p>
          MoneyBall Score는 다음의 외부 서비스를 이용하여 운영됩니다. 각 서비스
          제공자는 자체 개인정보 정책을 따르며, 본 사이트는 해당 정책에 대해
          책임지지 않습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Vercel Inc.</strong> — 호스팅 및 방문자 통계. (
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              정책
            </a>
            )
          </li>
          <li>
            <strong>Supabase Inc.</strong> — 예측 데이터 저장. 방문자 개인정보는
            저장되지 않습니다. (
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              정책
            </a>
            )
          </li>
          <li>
            <strong>Anthropic PBC</strong> — AI 에이전트 토론 엔진 호출.
            방문자가 아닌 경기 데이터만 송신됩니다. (
            <a
              href="https://www.anthropic.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              정책
            </a>
            )
          </li>
        </ul>
        <p className="mt-3">
          경기·기록 데이터는 KBO 공식(koreabaseball.com), KBO Fancy Stats
          (kbofancystats.com), FanGraphs (fangraphs.com/leaders/international/kbo)의
          공개 데이터를 수집합니다. 방문자 개인정보와 관련이 없습니다.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "5. 보관 및 파기",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Vercel Analytics 집계 데이터: 서비스 제공자 정책에 따름 (최대 1년).</li>
        <li>서버 접근 로그: 30일 이내 자동 삭제.</li>
        <li>
          본 서비스가 자체 DB에 저장하는 사용자 개인정보는 없습니다. 따라서
          열람·정정·삭제 요청 대상이 되는 개인정보도 보유하지 않습니다.
        </li>
      </ul>
    ),
  },
  {
    id: "rights",
    title: "6. 이용자 권리",
    body: (
      <>
        <p>
          이용자는 언제든 본 사이트에 대한 방문을 중단할 수 있으며, 브라우저
          설정을 통해 쿠키를 차단하거나 삭제할 수 있습니다. 제3자 광고 쿠키에
          대한 세부 설정은 각 서비스의 정책 페이지를 참고하십시오.
        </p>
        <p className="mt-3">
          개인정보 관련 문의는{" "}
          <a
            href="mailto:moneyballscore777@gmail.com"
            className="text-brand-500 hover:underline"
          >
            moneyballscore777@gmail.com
          </a>
          으로 연락 바랍니다.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "7. 방침 변경",
    body: (
      <p>
        본 방침은 법령, 서비스 정책 또는 도입되는 외부 서비스에 따라 변경될 수
        있으며, 변경 시 본 페이지에 최종 개정일과 함께 공지합니다.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <article className="max-w-3xl space-y-8">
      <Breadcrumb items={[{ label: "개인정보처리방침" }]} className="mb-2" />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">개인정보처리방침</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          시행일: 2026-04-17 · 최종 개정: 2026-04-17
        </p>
        <p className="text-gray-600 dark:text-gray-300 pt-2">
          MoneyBall Score(이하 &ldquo;본 서비스&rdquo;)는 이용자의 개인정보를
          소중히 다루며, 필요 최소한의 기술 정보만을 수집합니다.
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

      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className="bg-white dark:bg-[var(--color-surface-card)] rounded-xl border border-gray-200 dark:border-[var(--color-border)] p-6 space-y-3"
          >
            <h2 className="text-xl font-bold">{s.title}</h2>
            <div className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {s.body}
            </div>
          </section>
        ))}
      </div>

      <footer className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-[var(--color-border)] pt-6">
        관련 문서:{" "}
        <Link href="/terms" className="text-brand-500 hover:underline">
          이용약관
        </Link>{" "}
        ·{" "}
        <Link href="/contact" className="text-brand-500 hover:underline">
          문의
        </Link>
      </footer>
    </article>
  );
}
