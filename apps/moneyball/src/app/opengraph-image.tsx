import { ImageResponse } from "next/og";
import { CURRENT_SCORING_RULE } from "@moneyball/shared";

// 루트 Open Graph 이미지: 라우트별 자체 이미지가 없을 때 fallback.
// satori(@vercel/og)는 CJK 폰트를 번들하지 않아 라틴 + 이모지 중심으로 설계.

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoneyBall Score - Sabermetrics KBO Predictions";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a1f12 0%, #1a3d24 50%, #2d6b3f 100%)",
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
          <span>MoneyBall Score</span>
        </div>

        <div
          style={{
            marginTop: 72,
            fontSize: 108,
            fontWeight: 800,
            letterSpacing: "-4px",
            lineHeight: 1,
          display: "flex",
        }}
        >
          KBO Predictions
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 44,
            opacity: 0.88,
            letterSpacing: "-1px",
            display: "flex",
          }}
        >
          Sabermetrics + AI Debate
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {["wOBA", "FIP", "WAR", "Elo", "10 Factors"].map((tag) => (
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
          <span>moneyballscore.vercel.app</span>
          <span>Daily updates · {CURRENT_SCORING_RULE}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
