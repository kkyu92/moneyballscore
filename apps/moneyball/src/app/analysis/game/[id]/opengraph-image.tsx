import { ImageResponse } from "next/og";
import { assertSelectOk, type SelectResult } from "@moneyball/shared";
import { createClient } from "@/lib/supabase/server";

// 경기 분석 동적 OG 이미지: /analysis/game/[id] 경기별 소셜 공유.
// satori(@vercel/og)는 CJK 폰트를 번들하지 않으므로 라틴 문자·숫자 중심으로 설계.
// confidence (0~1) → 백분율 표시. predicted_winner(team_id) vs home_team_id 비교로 홈/원정 판별.

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OG_TEAM: Record<string, string> = {
  SK: "SSG", HT: "KIA", LG: "LG", OB: "Doosan",
  KT: "KT", SS: "Samsung", LT: "Lotte", HH: "Hanwha", NC: "NC", WO: "Kiwoom",
};

interface Props {
  params: Promise<{ id: string }>;
}

interface GameOgRow {
  game_date: string;
  home_team_id: number;
  home_team: { code: string } | null;
  away_team: { code: string } | null;
  predictions: Array<{
    prediction_type: string;
    confidence: number;
    predicted_winner: number | null;
  }> | null;
}

async function getGameOg(gameId: number) {
  try {
    const supabase = await createClient();
    const result = (await supabase
      .from("games")
      .select(`
        game_date, home_team_id,
        home_team:teams!games_home_team_id_fkey(code),
        away_team:teams!games_away_team_id_fkey(code),
        predictions(prediction_type, confidence, predicted_winner)
      `)
      .eq("id", gameId)
      .maybeSingle()) as SelectResult<GameOgRow>;

    const { data } = assertSelectOk(result, "opengraph-image[id] getGameOg");
    if (!data) return null;

    const game = data as unknown as GameOgRow;
    const preGame = game.predictions?.find(
      (p) => p.prediction_type === "pre_game",
    );

    const homeCode = game.home_team?.code ?? "";
    const awayCode = game.away_team?.code ?? "";
    const homeLabel = OG_TEAM[homeCode] ?? homeCode;
    const awayLabel = OG_TEAM[awayCode] ?? awayCode;

    let winnerLabel: string | null = null;
    let confPct: number | null = null;
    if (preGame?.predicted_winner != null && preGame.confidence != null) {
      const isHomePredicted = preGame.predicted_winner === game.home_team_id;
      winnerLabel = isHomePredicted ? homeLabel : awayLabel;
      confPct = Math.round(preGame.confidence * 100);
    }

    return { date: game.game_date, homeLabel, awayLabel, winnerLabel, confPct };
  } catch (err) {
    console.error(`opengraph-image[id] getGameOg(${gameId}) failed:`, err);
    return null;
  }
}

export default async function Image({ params }: Props) {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  const og = Number.isFinite(gameId) ? await getGameOg(gameId) : null;

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
        {/* Brand header */}
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

        {/* Matchup hero */}
        <div
          style={{
            marginTop: 56,
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            {og?.awayLabel ?? "KBO"}
          </span>
          <span style={{ fontSize: 56, opacity: 0.5, fontWeight: 300 }}>
            vs
          </span>
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            {og?.homeLabel ?? "Game"}
          </span>
        </div>

        {/* Date */}
        <div
          style={{
            marginTop: 20,
            fontSize: 36,
            opacity: 0.72,
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          {og?.date ?? ""}
        </div>

        {/* AI prediction badge */}
        {og?.winnerLabel != null && og.confPct !== null && (
          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 28px",
              background: "rgba(255,255,255,0.14)",
              borderRadius: 16,
              alignSelf: "flex-start",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 26, opacity: 0.8, fontWeight: 400 }}>
              AI Pick:
            </span>
            <span>{`${og.winnerLabel} ${og.confPct}%`}</span>
          </div>
        )}

        {/* Footer */}
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
          <span>moneyballscore.vercel.app</span>
          <span>AI Debate Engine · v2</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
