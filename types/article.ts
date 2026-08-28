export interface Article {
  id: string;
  authorId: string;
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt: string; // YYYY-MM-DD
  platform?: string;
  createdAt: number;
}
