import type { MetadataRoute } from "next";
import { newsArticles } from "./news/news-data";

const BASE_URL = "https://lumos-ynu.jp";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1.0, changeFrequency: "weekly" },
    { url: `${BASE_URL}/about`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE_URL}/news`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${BASE_URL}/members`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE_URL}/projects`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE_URL}/contact`, priority: 0.5, changeFrequency: "monthly" },
  ];

  const newsPages: MetadataRoute.Sitemap = newsArticles.map((article) => ({
    url: `${BASE_URL}/news/${article.id}`,
    priority: 0.5,
    changeFrequency: "monthly",
  }));

  return [...staticPages, ...newsPages];
}
