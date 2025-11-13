import {Timestamp} from 'firebase/firestore';

// Base interface for all content types
export interface BaseContent {
  id: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  published: boolean;
  author?: string;
}
export interface NewsItemData extends BaseContent {
  date: string;
  title: string;
  slug?: string;
  tags?: string[];
  summary: string;
  content: string;
  image: string;
  category: string;
}

// News/Announcements
export interface NewsItem extends BaseContent {
  title: string;
  summary: string;
  content: string;
  date: Timestamp | Date;
  slug?: string;
  tags?: string[];
  featured?: boolean;
  imageUrl?: string;
}

export interface NewsItemData extends BaseContent {
  date: string;
  title: string;
  slug?: string;
  tags?: string[];
  summary: string;
  content: string;
  image: string;
  category: string;
}

// Events
export interface Event extends BaseContent {
  title: string;
  description: string;
  content: string;
  eventDate: Timestamp | Date;
  endDate?: Timestamp | Date;
  location: string;
  locationType: 'online' | 'offline' | 'hybrid';
  maxParticipants?: number;
  currentParticipants?: number;
  registrationRequired: boolean;
  registrationUrl?: string;
  slug?: string;
  tags?: string[];
  imageUrl?: string;
}

// Activities (like hands-on sessions, projects, etc.)
export interface Activity extends BaseContent {
  title: string;
  description: string;
  content: string;
  category: 'hands-on' | 'project' | 'study-session' | 'social' | 'presentation' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  duration?: string; // e.g., "3 days", "2 weeks"
  requirements?: string[];
  slug?: string;
  tags?: string[];
  imageUrl?: string;
}

// Site content (for static pages)
export interface SiteContent extends BaseContent {
  key: string; // unique identifier like 'about-intro', 'hero-title', etc.
  type: 'text' | 'html' | 'markdown';
  content: string;
  description?: string;
}

// Member profiles (if needed)
export interface Member extends BaseContent {
  name: string;
  role: 'admin' | 'member' | 'graduate' | 'advisor';
  year?: number;
  department?: string;
  bio?: string;
  skills?: string[];
  profileImageUrl?: string;
  socialLinks?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

// Contact form submissions
export interface ContactSubmission extends BaseContent {
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  replyMessage?: string;
}

// Utility types
export type ContentType = 'news' | 'events' | 'activities' | 'site-content' | 'members' | 'contact';

export interface ContentMetadata {
  totalCount: number;
  publishedCount: number;
  lastUpdated: Timestamp | Date;
}

// Form types for creating/editing content
export interface CreateNewsItem extends Omit<NewsItem, 'id' | 'createdAt' | 'updatedAt'> {
}

export interface UpdateNewsItem extends Partial<Omit<NewsItem, 'id' | 'createdAt'>> {
}

export interface CreateEvent extends Omit<Event, 'id' | 'createdAt' | 'updatedAt'> {
}

export interface UpdateEvent extends Partial<Omit<Event, 'id' | 'createdAt'>> {
}

export interface CreateActivity extends Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> {
}

export interface UpdateActivity extends Partial<Omit<Activity, 'id' | 'createdAt'>> {
}
