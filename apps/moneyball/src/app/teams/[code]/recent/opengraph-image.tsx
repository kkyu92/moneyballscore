import { ImageResponse } from "next/og";
import { KBO_TEAMS, RECENT_FORM_GAMES, type TeamCode } from "@moneyball/shared";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "KBO 팀 최근 경기 - MoneyBall Score";

interface Props {
  params: Promise<{ code: string }>;
}

function isTeamCode(v: string): v is TeamCode {
  return v in KBO_TEAMS;
}

export default async function Image({ params }: Props) {
  const { code } = await params;
  const teamName = isTeamCode(code) ? KBO_TEAMS[code].name : code;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #0a1f12 0%, #1a3d24 50%, #2d6b3f 100%)",
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
            fontSize: 104,
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
            fontSize: 44,
            opacity: 0.88,
            letterSpacing: "-1px",
            display: "flex",
          }}
        >
          최근 {RECENT_FORM_GAMES}경기 예측 결과
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {["적중/실패", "신뢰도", `최근 ${RECENT_FORM_GAMES}경기`, "팀 트렌드", "FINAL"].map((tag) => (
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
          <span>moneyballscore.vercel.app/teams/{code}/recent</span>
          <span>최근 경기 · 적중 추적</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
