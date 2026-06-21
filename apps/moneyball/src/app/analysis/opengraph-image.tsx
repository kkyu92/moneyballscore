import { ImageResponse } from "next/og";
import { KBO_PREDICT_DAILY_TIME_KST } from "@moneyball/shared";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI 분석 | MoneyBall Score";

export default function AnalysisHubOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #2e0e1a 0%, #4d1c2c 50%, #823a4d 100%)",
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
          <span style={{ fontSize: 42 }}>⚾</span>
          <span>MoneyBall Score</span>
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          AI Analysis
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 36,
            opacity: 0.9,
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          Big match debate · Factor breakdown · Week confidence
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {["Multi-agent debate", "Home vs away", "Umpire bias", `Daily ${KBO_PREDICT_DAILY_TIME_KST}`].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                padding: "12px 22px",
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.20)",
                borderRadius: 14,
              }}
            >
              {label}
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
          <span>moneyballscore.vercel.app/analysis</span>
          <span>AI Debate Engine · v2</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
