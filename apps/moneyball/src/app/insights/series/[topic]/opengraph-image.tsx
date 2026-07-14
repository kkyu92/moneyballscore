import { ImageResponse } from "next/og";
import { KBO_FACTOR_COUNT, KBO_TEAMS, SITE_HOST } from "@moneyball/shared";
import { parseSeriesTopic } from "@/lib/insights/series";
import { BRAND_GRADIENT_KBO_135 } from "@/lib/design-tokens";

// 동적 OG image — /insights/series/<topic>.
// satori (@vercel/og) 는 CJK 폰트를 번들하지 않음 → 라틴 + 이모지 fallback.
// 영문 team name 매핑은 KBO_TEAMS 의 한글 name 에서 분리 (KBO 영문 코드 = 안정).

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoneyBall Score — KBO AI Insights Series";

// KBO_TEAMS code → 영문 풀네임 (CJK fallback).
const TEAM_EN: Record<string, string> = {
  SK: "SSG Landers",
  HT: "KIA Tigers",
  LG: "LG Twins",
  OB: "Doosan Bears",
  KT: "KT Wiz",
  SS: "Samsung Lions",
  LT: "Lotte Giants",
  HH: "Hanwha Eagles",
  NC: "NC Dinos",
  WO: "Kiwoom Heroes",
};

interface Props {
  params: Promise<{ topic: string }>;
}

export default async function Image({ params }: Props) {
  const { topic: slug } = await params;
  const parsed = parseSeriesTopic(slug);

  const team1En = parsed ? TEAM_EN[parsed.team1] : "KBO";
  const team2En = parsed ? TEAM_EN[parsed.team2] : "Series";
  const team1Code = parsed?.team1 ?? "—";
  const team2Code = parsed?.team2 ?? "—";

  // 색상: brand 그린 그라데이션 (DESIGN.md `--bg-hero-start/end` 토큰 정렬).
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            BRAND_GRADIENT_KBO_135,
          color: "white",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 32,
            opacity: 0.92,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 44,
          display: "flex",
        }}>⚾</span>
          <span>MoneyBall Score</span>
          <span style={{ opacity: 0.6, fontSize: 24,
          display: "flex",
        }}>· KBO Series</span>
        </div>

        {/* Main matchup */}
        <div
          style={{
            marginTop: 60,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
              display: "flex",
              alignItems: "baseline",
              gap: 32,
            }}
          >
            <span>{team1Code}</span>
            <span
              style={{
                fontSize: 56,
                opacity: 0.65,
                fontWeight: 600,
          display: "flex",
        }}
            >
              VS
            </span>
            <span>{team2Code}</span>
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 500,
              opacity: 0.85,
              marginTop: 12,
          display: "flex",
        }}
          >
            {team1En} vs {team2En}
          </div>
        </div>

        {/* Bottom callouts */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              opacity: 0.85,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span>{`📊 AI Sabermetrics · ${KBO_FACTOR_COUNT} Factors`}</span>
            <span>🎯 Series Reasoning Timeline</span>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              opacity: 0.7,
              padding: "10px 18px",
              border: "2px solid rgba(255,255,255,0.4)",
              borderRadius: 999,
          display: "flex",
        }}
          >
            {SITE_HOST}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

// Side-effect: KBO_TEAMS 매핑 검증 — TEAM_EN 키 누락 시 build-time error
// (테스트가 본 export 를 import 해서 invariant 검증).
export function _verifyTeamCodeMapping(): boolean {
  const codes = Object.keys(KBO_TEAMS);
  for (const c of codes) {
    if (!TEAM_EN[c]) return false;
  }
  return true;
}
