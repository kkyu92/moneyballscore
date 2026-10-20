import { ImageResponse } from "next/og";
import { SITE_HOST } from "@moneyball/shared";
import { BRAND_GRADIENT_KBO_135 } from "@/lib/design-tokens";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "로또 조합 검증 - MoneyBall Score";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BRAND_GRADIENT_KBO_135,
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
          <span style={{ fontSize: 48, display: "flex" }}>🔍</span>
          <span>MoneyBall Score · Lotto</span>
        </div>

        <div
          style={{
            marginTop: 72,
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-4px",
            lineHeight: 1.1,
            display: "flex",
          }}
        >
          조합 검증
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 38,
            opacity: 0.88,
            letterSpacing: "-1px",
            display: "flex",
          }}
        >
          우리 예측 + 역대 1등 중복 판별
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {["6/45 매칭", "역대 1등", "즉시 확인"].map((tag) => (
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
            fontSize: 24,
            opacity: 0.7,
          }}
        >
          <span>{SITE_HOST}/lotto/check</span>
          <span>Statistical Analysis · Not Betting</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
