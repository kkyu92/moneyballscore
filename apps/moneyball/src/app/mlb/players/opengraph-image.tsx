import { ImageResponse } from "next/og";
import { MLB_TEAM_COUNT } from "@moneyball/shared";
import { MLB_FACTOR_COUNTS } from "@moneyball/kbo-data";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `MLB Statcast ${MLB_FACTOR_COUNTS.statcast} — xwOBA · Barrel · Hard hit · Launch | MoneyBall Score`;

export default function MlbPlayersHubOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a0a2e 0%, #581c87 50%, #a855f7 100%)",
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
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
          display: "flex",
        }}
        >
          Statcast {MLB_FACTOR_COUNTS.statcast}
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
          xwOBA · Barrel% · Hard hit% · Launch angle · {MLB_TEAM_COUNT}팀 측정 status
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {["xwOBA", "Barrel %", "Hard hit %", "Launch angle"].map((label) => (
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
          <span>moneyballscore.vercel.app/mlb/players</span>
          <span>Statcast {MLB_FACTOR_COUNTS.statcast} · {MLB_TEAM_COUNT} teams</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
