import { ImageResponse } from "next/og";
import { BRAND_GRADIENT_KBO_135 } from "@/lib/design-tokens";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            BRAND_GRADIENT_KBO_135,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "82px",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          MB
        </div>
      </div>
    ),
    { ...size },
  );
}
