import { ImageResponse } from "next/og";
import { buildPitcherProfile } from "@/lib/players/buildPitcherProfile";
import { FACTOR_LABELS_TECHNICAL } from "@/lib/predictions/factorLabels";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "KBO Pitcher Profile - MoneyBall Score";

interface Props {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default async function Image({ params }: Props) {
  const { id } = await params;
  const playerId = parseId(id);
  let label = "Pitcher";
  let teamLabel = "KBO";
  if (playerId != null) {
    const profile = await buildPitcherProfile(playerId).catch(() => null);
    if (profile) {
      label = profile.nameKo;
      teamLabel = profile.teamName ?? "KBO";
    }
  }
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #0d1a2b 0%, #1f3b5c 50%, #2d6b9f 100%)",
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
          <span style={{ fontSize: 48 }}>⚾</span>
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
          {label}
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
          {teamLabel} · 선발 투수 프로필
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {[
            FACTOR_LABELS_TECHNICAL.sp_fip,
            FACTOR_LABELS_TECHNICAL.sp_xfip,
            "K%",
            "BB%",
            FACTOR_LABELS_TECHNICAL.recent_form,
          ].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.14)",
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 600,
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
          <span>moneyballscore.vercel.app/players/{id}</span>
          <span>Pitcher Profile · Sabermetrics</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
