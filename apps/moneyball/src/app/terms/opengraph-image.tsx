import { ImageResponse } from "next/og";
import { NEUTRAL_GRADIENT_135 } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "MoneyBall Score 이용약관 - 서비스 성격 · 면책 · 스포츠 베팅 고지";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NEUTRAL_GRADIENT_135,
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
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1.05,
            display: "flex",
          }}
        >
          이용약관
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
          서비스 성격 · 면책 · 스포츠 베팅 고지
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {["서비스 성격", "예측 정확성 무보증", "스포츠 베팅 고지", "분쟁 해결"].map((tag) => (
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
          <span>moneyballscore.vercel.app/terms</span>
          <span>이용약관 · 법적고지</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
