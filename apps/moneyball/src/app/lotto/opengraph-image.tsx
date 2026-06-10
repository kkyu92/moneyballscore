import { ImageResponse } from "next/og";
import { getLatestLottoPicks } from "@/lib/lotto/picks-loader";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "로또 통계 분석 | MoneyBall Score";

export default function LottoHubOgImage() {
  const picks = getLatestLottoPicks();
  const drawNo = picks?.drawNo ?? "?";
  const date = picks?.date ?? "";
  const top5 = picks?.sets.slice(0, 5) ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #132d1a 0%, #1a3d24 60%, #0a1f12 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "48px 56px",
          fontFamily: "sans-serif",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ background: "#c5a23e", color: "#132d1a", fontSize: 14, fontWeight: 700, padding: "4px 12px", borderRadius: 6 }}>
            {`제 ${drawNo}회`}
          </span>
          <span style={{ color: "#8dcea0", fontSize: 14 }}>MoneyBall Score · 로또 통계 분석</span>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>
          {`${date} 추천 조합`}
        </div>
        <div style={{ color: "#c4e8cf", fontSize: 16, marginBottom: 32 }}>
          256개 통계 규칙 통과 · 역대 미출현 조합 선별
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {top5.map((set, i) => (
            <div key={set.idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "#c5a23e", color: "#132d1a", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, minWidth: 28, textAlign: "center" }}>
                {["A", "B", "C", "D", "E"][i]}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {set.numbers.map((n) => (
                  <span
                    key={n}
                    style={{
                      width: 36, height: 36,
                      borderRadius: "50%",
                      background: n <= 10 ? "#facc15" : n <= 20 ? "#3b82f6" : n <= 30 ? "#ef4444" : n <= 40 ? "#6b7280" : "#16a34a",
                      color: n <= 10 ? "#713f12" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
              <span style={{ color: "#8dcea0", fontSize: 13 }}>{`합 ${set.sum}`}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
