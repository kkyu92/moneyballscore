import { ImageResponse } from "next/og";
import { assertSelectOk } from "@moneyball/shared";
import { createClient } from "@/lib/supabase/server";

// 동적 Open Graph 이미지: /predictions/YYYY-MM-DD 각 날짜별로 생성.
// satori(@vercel/og)는 CJK 폰트를 번들하지 않으므로 라틴 문자·숫자 중심으로 설계.

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: Promise<{ date: string }>;
}

async function getStats(date: string) {
  // assertSelectOk — cycle 151 silent drift family detection. 기존 try/catch 가 supabase
  // .error 와 ImageResponse runtime 에러를 동시에 swallow → DB 오류여도 OG image 0 통계로
  // silent fallback (관측 0 dispatch). assertSelectOk 가 throw → catch 가 console.error
  // 로그 후 동일 fallback (사용자 가시 image 는 그대로, silent → observable 전환).
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("games")
      .select(
        "id, predictions!inner(confidence, is_correct, prediction_type)",
      )
      .eq("game_date", date)
      .eq("predictions.prediction_type", "pre_game");

    const { data } = assertSelectOk(result, "opengraph-image getStats");

    interface StatsRow {
      id: number;
      predictions: Array<{
        confidence: number;
        is_correct: boolean | null;
        prediction_type: string;
      }>;
    }
    const games = (data ?? []) as unknown as StatsRow[];
    const n = games.length;
    const verified = games.filter(
      (g) => g.predictions?.[0]?.is_correct !== null,
    );
    const correct = verified.filter(
      (g) => g.predictions?.[0]?.is_correct === true,
    );
    const rate = verified.length > 0 ? Math.round((correct.length / verified.length) * 100) : null;

    return { n, verifiedN: verified.length, correctN: correct.length, rate };
  } catch (err) {
    console.error(`opengraph-image getStats(${date}) failed:`, err);
    return { n: 0, verifiedN: 0, correctN: 0, rate: null };
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

        {/* Date — hero */}
        <div
          style={{
            marginTop: 64,
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          {date}
        </div>

        {/* Sub headline */}
        <div
          style={{
            marginTop: 24,
            fontSize: 44,
            opacity: 0.88,
            letterSpacing: "-1px",
            display: "flex",
          }}
        >
          {`${stats.n} KBO Predictions`}
        </div>

        {/* Accuracy badge — only if verified data exists */}
        {stats.rate !== null && (
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
            <span>{`Accuracy ${stats.rate}%`}</span>
            <span style={{ opacity: 0.7, fontSize: 26 }}>
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
