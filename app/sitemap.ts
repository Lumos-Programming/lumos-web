import type { MetadataRoute } from "next";
import { listPublicBlogs } from "@/lib/blogs";
import { listPublishedNews } from "@/lib/news";
import { blogDetailPath } from "@/types/blog";

const BASE_URL = "https://lumos-ynu.jp";

// お知らせとブログを Firestore から読むため、ビルド時に生成しない
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, priority: 1.0, changeFrequency: "weekly" },
    { url: `${BASE_URL}/about`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${BASE_URL}/news`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${BASE_URL}/blogs`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE_URL}/members`, priority: 0.6, changeFrequency: "weekly" },
    { url: `${BASE_URL}/projects`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE_URL}/contact`, priority: 0.5, changeFrequency: "monthly" },
  ];

  const articles = await listPublishedNews();
  const newsPages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/news/${article.id}`,
    priority: 0.5,
    changeFrequency: "monthly",
  }));

  const blogs = await listPublicBlogs();
  const blogPages: MetadataRoute.Sitemap = blogs.map((blog) => ({
    url: `${BASE_URL}${blogDetailPath(blog.id)}`,
    priority: 0.4,
    changeFrequency: "monthly",
  }));

  return [...staticPages, ...newsPages, ...blogPages];
}
