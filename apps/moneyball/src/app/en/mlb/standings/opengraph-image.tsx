import { ImageResponse } from "next/og";
import { MLB_TEAM_COUNT, MLB_DIVISION_COUNT, SITE_HOST } from "@moneyball/shared";
import { MLB_GRADIENT_STANDINGS_135 } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MLB Standings | MoneyBall Score";

export default function EnMlbStandingsOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: MLB_GRADIENT_STANDINGS_135,
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
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
          display: "flex",
        }}
        >
          Standings
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
          AL/NL · East/Central/West · {MLB_DIVISION_COUNT} divisions · {MLB_TEAM_COUNT} teams · park factor
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {["AL East", "AL Central", "AL West", "NL East", "NL Central", "NL West"].map((label) => (
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
          <span>{SITE_HOST}/en/mlb/standings</span>
          <span>EN · KO · {MLB_TEAM_COUNT} teams</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
