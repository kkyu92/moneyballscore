import { ImageResponse } from "next/og";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";
import { MLB_TEAMS, SITE_HOST } from "@moneyball/shared";
import { parseMlbSeriesTopic } from "@/app/mlb/insights/insights-data";
import { MLB_GRADIENT_INSIGHTS_135 } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoneyBall Score — MLB AI Insights Series";

interface Props {
  params: Promise<{ topic: string }>;
}

export default async function Image({ params }: Props) {
  const { topic: slug } = await params;
  const topic = parseMlbSeriesTopic(slug);

  const team1Name = topic ? MLB_TEAMS[topic.team1].name : "MLB";
  const team2Name = topic ? MLB_TEAMS[topic.team2].name : "Series";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: MLB_GRADIENT_INSIGHTS_135,
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
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 44, display: "flex" }}>⚾</span>
          <span>MoneyBall Score</span>
          <span style={{ opacity: 0.6, fontSize: 24, display: "flex" }}>· MLB Series</span>
        </div>

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
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: "-2px",
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            {team1Name} vs {team2Name}
          </div>
        </div>

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
            <span>{`📊 Pure Sabermetrics · ${MLB_FACTOR_COUNTS.total} Factors`}</span>
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
    { ...size },
  );
}
