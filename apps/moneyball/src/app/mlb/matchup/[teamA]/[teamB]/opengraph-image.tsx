import { ImageResponse } from "next/og";
import { mlbShortTeamName, SITE_HOST } from "@moneyball/shared";
import { mlbCanonicalPair } from "@/lib/mlb/mlbCanonicalPair";
import { FACTOR_LABELS_TECHNICAL } from "@/lib/predictions/factorLabels";
import { MLB_GRADIENT_MATCHUP_135 } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MLB Matchup - MoneyBall Score";

interface Props {
  params: Promise<{ teamA: string; teamB: string }>;
}

export default async function Image({ params }: Props) {
  const { teamA, teamB } = await params;
  const pair = mlbCanonicalPair(teamA, teamB);
  const a = pair ? mlbShortTeamName(pair.codeA) : teamA;
  const b = pair ? mlbShortTeamName(pair.codeB) : teamB;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: MLB_GRADIENT_MATCHUP_135,
          color: "white",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 36,
            opacity: 0.92,
            letterSpacing: "-0.5px",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 48,
          display: "flex",
        }}>⚾</span>
          <span>MoneyBall Score · MLB</span>
        </div>

        <div
          style={{
            marginTop: 80,
            display: "flex",
            alignItems: "center",
            gap: 48,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
              display: "flex",
            }}
          >
            {a}
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              opacity: 0.7,
              display: "flex",
            }}
          >
            vs
          </div>
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
              display: "flex",
            }}
          >
            {b}
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            opacity: 0.88,
            letterSpacing: "-1px",
            display: "flex",
          }}
        >
          MLB 상대전적 · AI 예측 적중률
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {[
            FACTOR_LABELS_TECHNICAL.head_to_head,
            "팩터 비교",
            FACTOR_LABELS_TECHNICAL.recent_form,
            FACTOR_LABELS_TECHNICAL.park_factor,
          ].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.14)",
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 600,
          display: "flex",
        }}
            >
              {tag}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            opacity: 0.7,
          }}
        >
          <span>
            {SITE_HOST}/mlb/matchup/{teamA}/{teamB}
          </span>
          <span>Matchup · Sabermetrics</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
