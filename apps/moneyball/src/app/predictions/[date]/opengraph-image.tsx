import { ImageResponse } from "next/og";
import { assertSelectOk, errMsg, CURRENT_SCORING_RULE } from "@moneyball/shared";
import { createClient } from "@/lib/supabase/server";

// 동적 Open Graph 이미지: /predictions/YYYY-MM-DD 각 날짜별로 생성.
// satori(@vercel/og) CJK 폰트 X — 라틴 문자·숫자 중심.
// cycle 1021 (c12) 강화 — top pick (highest winner prob) 카드 추가.

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ date: string }>;
}

interface TopPickRow {
  homeCode: string;
  awayCode: string;
  winnerCode: string;
  winnerProb: number; // 0..1, max(homeWinProb, 1-homeWinProb)
}

async function getStats(date: string): Promise<{
  n: number;
  verifiedN: number;
  correctN: number;
  rate: number | null;
  topPick: TopPickRow | null;
}> {
  // assertSelectOk — cycle 151 silent drift family. cycle 1021 (c12) — top pick
  // 추출 위해 winner/game team code + reasoning JSONB 추가.
  // scoring_rule filter (CURRENT_SCORING_RULE) — shadow row 제외 (#1338 family).
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("predictions")
      .select(
        "confidence, is_correct, prediction_type, scoring_rule, reasoning, winner:teams!predictions_predicted_winner_fkey(code), game:games!predictions_game_id_fkey(game_date, home_team:teams!games_home_team_id_fkey(code), away_team:teams!games_away_team_id_fkey(code))",
      )
      .eq("prediction_type", "pre_game")
      .eq("scoring_rule", CURRENT_SCORING_RULE)
      .eq("game.game_date", date);

    const { data } = assertSelectOk(result, "opengraph-image getStats");

    interface PredRow {
      confidence: number;
      is_correct: boolean | null;
      prediction_type: string;
      scoring_rule: string;
      reasoning: { homeWinProb?: number } | null;
      winner: { code: string } | null;
      game: { game_date: string; home_team: { code: string } | null; away_team: { code: string } | null } | null;
    }
    const preds = ((data ?? []) as unknown as PredRow[]).filter((p) => p.game?.game_date === date);
    const n = preds.length;
    const verifiedRows = preds.filter((p) => p.is_correct !== null);
    const correctRows = verifiedRows.filter((p) => p.is_correct === true);
    const rate = verifiedRows.length > 0 ? Math.round((correctRows.length / verifiedRows.length) * 100) : null;

    // cycle 1021 (c12) — top pick = highest winner prob (max(hwp, 1-hwp))
    let topPick: TopPickRow | null = null;
    let topProb = 0;
    for (const p of preds) {
      const hwp = p.reasoning?.homeWinProb;
      if (typeof hwp !== "number") continue;
      const winnerProb = Math.max(hwp, 1 - hwp);
      if (winnerProb > topProb) {
        topProb = winnerProb;
        topPick = {
          homeCode: p.game?.home_team?.code ?? "?",
          awayCode: p.game?.away_team?.code ?? "?",
          winnerCode: p.winner?.code ?? "?",
          winnerProb,
        };
      }
    }

    return { n, verifiedN: verifiedRows.length, correctN: correctRows.length, rate, topPick };
  } catch (err) {
    console.error(`opengraph-image getStats(${date}) failed:`, errMsg(err));
    return { n: 0, verifiedN: 0, correctN: 0, rate: null, topPick: null };
  }
}

export default async function Image({ params }: Props) {
  const { date } = await params;
  const stats = await getStats(date);

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

        {/* Date — hero (cycle 1021 (c12) — top pick 카드 박제 시 sub headline 압축) */}
        <div
          style={{
            marginTop: 48,
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          {date}
        </div>

        {/* Sub headline */}
        <div
          style={{
            marginTop: 16,
            fontSize: 36,
            opacity: 0.85,
            letterSpacing: "-0.5px",
            display: "flex",
          }}
        >
          {`${stats.n} KBO Predictions`}
        </div>

        {/* Top pick card — cycle 1021 (c12) */}
        {stats.topPick && (
          <div
            style={{
              marginTop: 32,
              display: "flex",
              flexDirection: "column",
              padding: "28px 36px",
              background: "rgba(255,255,255,0.10)",
              border: "2px solid rgba(255,255,255,0.18)",
              borderRadius: 20,
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: 22,
                opacity: 0.65,
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: 12,
                display: "flex",
              }}
            >
              {"Top Pick"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <span style={{ fontSize: 44, fontWeight: 700, opacity: 0.7 }}>
                {stats.topPick.awayCode}
              </span>
              <span style={{ fontSize: 28, opacity: 0.5 }}>@</span>
              <span style={{ fontSize: 44, fontWeight: 700, opacity: 0.7 }}>
                {stats.topPick.homeCode}
              </span>
              <span style={{ fontSize: 28, opacity: 0.5 }}>{"->"}</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: "#c4e8cf" }}>
                {stats.topPick.winnerCode}
              </span>
              <span style={{ fontSize: 44, fontWeight: 700 }}>
                {`${Math.round(stats.topPick.winnerProb * 100)}%`}
              </span>
            </div>
          </div>
        )}

        {/* Accuracy badge — only if verified data exists */}
        {stats.rate !== null && (
          <div
            style={{
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 28px",
              background: "rgba(255,255,255,0.14)",
              borderRadius: 16,
              alignSelf: "flex-start",
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            <span>{`Accuracy ${stats.rate}%`}</span>
            <span style={{ opacity: 0.7, fontSize: 24 }}>
              {`${stats.correctN}/${stats.verifiedN}`}
            </span>
          </div>
        )}

        {/* Footer URL */}
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
