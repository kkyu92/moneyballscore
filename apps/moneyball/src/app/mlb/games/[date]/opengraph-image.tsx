import { ImageResponse } from "next/og";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { MLB_GRADIENT_TEAM_SKY_135 } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MLB 일자 예측 - MoneyBall Score";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function Image({ params }: Props) {
  const { date } = await params;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            MLB_GRADIENT_TEAM_SKY_135,
          color: "white",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 32,
            opacity: 0.92,
            letterSpacing: "-0.5px",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 42,
          display: "flex",
        }}>⚾</span>
          <span>MoneyBall Score · MLB</span>
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
          display: "flex",
        }}
        >
          {date}
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 36,
            opacity: 0.88,
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          MLB 경기 예측
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {[`${MLB_FACTOR_COUNTS.total}팩터`, `Statcast ${MLB_FACTOR_COUNTS.statcast}`, "Confidence", "구장보정"].map((tag) => (
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
            fontSize: 24,
            opacity: 0.7,
          }}
        >
          <span>moneyballscore.vercel.app/mlb/games/{date}</span>
          <span>KO · 일자 예측</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
