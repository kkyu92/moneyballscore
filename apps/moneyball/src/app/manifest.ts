import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MoneyBall Score - 세이버메트릭스 KBO 승부예측",
    short_name: "MoneyBall",
    description:
      "wOBA, FIP, WAR 등 세이버메트릭스 지표 + AI 에이전트 토론 + 10팩터 정량 모델 기반 KBO 매일 승부예측.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1f12",
    theme_color: "#2d6b3f",
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
