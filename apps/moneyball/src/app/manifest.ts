import type { MetadataRoute } from "next";
import { KBO_FACTOR_COUNT } from "@moneyball/shared";
import { brand } from "@/lib/design-tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyBall Score - 세이버메트릭스 KBO 승부예측",
    short_name: "MoneyBall",
    description: `wOBA, FIP, WAR 등 세이버메트릭스 지표 + AI 에이전트 토론 + ${KBO_FACTOR_COUNT}팩터 정량 모델 기반 KBO 매일 승부예측.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: brand[900],
    theme_color: brand[500],
    lang: "ko-KR",
    categories: ["sports", "news", "entertainment"],
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
