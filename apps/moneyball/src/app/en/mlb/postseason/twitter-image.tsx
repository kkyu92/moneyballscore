import { ImageResponse } from "next/og";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `MLB Postseason bracket — ${MLB_FACTOR_COUNTS.total} Factor series | MoneyBall Score`;

export default function EnMlbPostseasonTwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a1e 0%, #1e1b4b 50%, #6d28d9 100%)",
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
          <span>MoneyBall Score · MLB</span>
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
          Postseason
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 34,
            opacity: 0.9,
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          WC · DS · LCS · WS · 4-round bracket · {MLB_FACTOR_COUNTS.total}-factor series prediction
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {["Wild Card", "Div Series", "LCS", "World Series"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                padding: "12px 22px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
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
          <span>moneyballscore.vercel.app/en/mlb/postseason</span>
          <span>EN · KO · Live ETA 2026-09</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
