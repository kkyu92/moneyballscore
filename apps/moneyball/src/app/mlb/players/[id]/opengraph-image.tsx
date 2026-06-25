import { ImageResponse } from "next/og";
import { MLB_TEAMS, type MlbTeamCode, SITE_HOST } from "@moneyball/shared";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MLB Statcast Team - MoneyBall Score";

interface Props {
  params: Promise<{ id: string }>;
}

function isMlbTeamCode(v: string): v is MlbTeamCode {
  return v in MLB_TEAMS;
}

export default async function Image({ params }: Props) {
  const { id } = await params;
  const team = isMlbTeamCode(id) ? MLB_TEAMS[id] : null;
  const teamName = team?.name ?? id;
  const league = team ? `${team.league} ${team.division}` : "MLB";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #2b1f0d 0%, #5c4520 50%, #a07a3f 100%)",
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
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
            display: "flex",
          }}
        >
          {teamName}
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
          {league} · Statcast Deep-Dive
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {["xwOBA", "Barrel%", "Hard Hit%", "Launch Angle"].map((tag) => (
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
          <span>{SITE_HOST}/mlb/players/{id}</span>
          <span>MLB · Statcast Factors</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
