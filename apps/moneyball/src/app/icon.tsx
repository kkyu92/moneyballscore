import { ImageResponse } from "next/og";
import { neutral, BRAND_GRADIENT_KBO_135 } from "@/lib/design-tokens";

export const contentType = "image/png";

type IconVariant = {
  id: string;
  size: { width: number; height: number };
  maskable: boolean;
};

const VARIANTS: IconVariant[] = [
  { id: "192", size: { width: 192, height: 192 }, maskable: false },
  { id: "512", size: { width: 512, height: 512 }, maskable: false },
  { id: "512-maskable", size: { width: 512, height: 512 }, maskable: true },
];

export function generateImageMetadata() {
  return VARIANTS.map(({ id, size }) => ({
    id,
    contentType: "image/png",
    size,
  }));
}

export default function Icon({ id }: { id: string }) {
  const variant = VARIANTS.find((v) => v.id === id) ?? VARIANTS[0]!;
  const { width, height } = variant.size;
  const safePadding = variant.maskable ? width * 0.18 : 0;
  const fontSize = Math.round((width - safePadding * 2) * 0.46);

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
            width: `${width - safePadding * 2}px`,
            height: `${height - safePadding * 2}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: neutral.white,
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          MB
        </div>
      </div>
    ),
    { width, height },
  );
}
