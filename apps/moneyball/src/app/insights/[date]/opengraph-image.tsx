import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI Insights - MoneyBall Score Daily Judge Reasoning";

interface Props {
  params: Promise<{ date: string }>;
}

export default async function Image({ params }: Props) {
  const { date } = await params;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a0a2e 0%, #2d1659 50%, #4f2a9f 100%)",
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
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          {date}
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
          AI Insights · Judge Reasoning
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {["Judge", "Reasoning", "Debate", "Factors", "Daily"].map((tag) => (
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
          <span>moneyballscore.vercel.app/insights/{date}</span>
          <span>KBO · AI Judge</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
