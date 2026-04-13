import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://moneyball-kbo.vercel.app";

  return [
    { url: baseUrl, changeFrequency: "daily", priority: 1.0 },
    {
      url: `${baseUrl}/predictions`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    { url: `${baseUrl}/reviews`, changeFrequency: "daily", priority: 0.8 },
    {
      url: `${baseUrl}/dashboard`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
