import { ImageResponse } from "next/og";
import { KBO_FACTOR_COUNT, SITE_HOST } from "@moneyball/shared";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `MoneyBall Score 방법론 - 세이버메트릭스 ${KBO_FACTOR_COUNT}팩터 정량 모델`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a1a2e 0%, #163055 50%, #1f4d8c 100%)",
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
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1.05,
            display: "flex",
          }}
        >
          예측 방법론
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
          세이버메트릭스 {KBO_FACTOR_COUNT}팩터 정량 모델
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {[`${KBO_FACTOR_COUNT}팩터 가중합산`, "FIP / xFIP / wOBA", "Elo / WAR / SFR", "3소스 자동 수집"].map((tag) => (
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
          <span>{SITE_HOST}/about</span>
          <span>소개 · 방법론</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
