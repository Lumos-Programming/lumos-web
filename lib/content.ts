import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  QueryConstraint,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import {db} from './firebase';
import {
  NewsItem,
  Event,
  Activity,
  SiteContent,
  Member,
  ContactSubmission,
  CreateNewsItem,
  UpdateNewsItem,
  CreateEvent,
  UpdateEvent,
  CreateActivity,
  UpdateActivity, NewsItemData
} from '@/types/content';

// Collection names
export const COLLECTIONS = {
  NEWS: 'news',
  EVENTS: 'events',
  ACTIVITIES: 'activities',
  SITE_CONTENT: 'siteContent',
  MEMBERS: 'members',
  CONTACT: 'contact',
} as const;

// Utility function to convert Firestore timestamps to proper format
const convertTimestamps = (data: any) => {
  const converted = {...data};
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && converted[key].toDate) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

// Generic function to create slug from title
export const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const defaultNews = [
  {
    id: "4",
    date: "2025年10月31日",
    title: "クレープ屋 Crepe++",
    summary: "常盤祭にてクレープ屋を出店します。",
    content: `
    <p>2025年10月31日から11月2日にかけて開催される常盤祭にて、Lumosは「Crepe++」というクレープ屋を出店します！</p>
    <p>メンバー自ら調理し、さまざまな味のクレープを販売予定です。</p>
    <p>文化祭の雰囲気を楽しみながら、ぜひお立ち寄りください！</p>
  `,
    image: "/assets/Crepe.png",
    category: "イベント",
  },
  {
    id: "5",
    date: "2025年10月23日",
    title: "ピザパーティー",
    summary: "サークルメンバーでピザパーティーを開催しました！",
    content: `
    <p>2025年10月23日に、秋学期最初のイベントとしてピザパーティーを開催しました。</p>
    <p>約3か月ぶりの対面活動ということもあり、多くのメンバーが参加し、交流を深めました。</p>
    <p>楽しく充実した時間となりました。</p>
  `,
    image: "/assets/pizza.png",
    category: "イベント",
  },
  {
    id: "6",
    date: "2025年7月10日",
    title: "LT会",
    summary: "個人の成果を発表するLT会を開催しました。",
    content: `
    <p>2025年7月10日に、サークル内でLT（Lightning Talk）会を開催しました。</p>
    <p>参加者がそれぞれ10分程度の発表を行い、それぞれの成果を共有しました。</p>
    <p>互いに刺激を受ける良い機会となりました</p>
  `,
    image: "/assets/LT_1.png",
    category: "プロジェクト",
  },
  {
    id: "7",
    date: "2025年6月17日",
    title: "ドーナツパーティー",
    summary: "サークルメンバーでミスドのドーナツを食べました。",
    content: `
    <p>2025年6月17日に、Lumosメンバーでドーナツパーティーを開催しました！</p>
    <p>ミスタードーナツのドーナツをみんなで食べ、和やかな雰囲気で交流しました。</p>
  `,
    image: "/assets/donut.png",
    category: "イベント",
  },
  {
    id: "1",
    date: "2025年5月24日",
    title: "確定大新歓BBQ",
    summary: "5月24日に確定大新歓としてBBQを行います。BBQを通じて親睦を深めましょう。",
    content: `
      <p>2025年5月24日(土)に確定大新歓BBQを開催しました。</p>
      <p>当日は天気にも恵まれ、約25名の新入生・在学生が参加して、和やかで楽しい時間を過ごしました。</p>

      <p>プログラミングの話から大学生活のことまで、新入生同士の交流も深まりました！</p>

      <p>今後もLumosでは、学びと交流の場をどんどん企画していきます。</p>

    `,
    image: "/assets/BBQ.jpg",
    category: "イベント",
  },
  {
    id: "2",
    date: "2025年5月21-23日",
    title: "初学者向けプログラミング学習会",
    summary: "21-23日に3日連続の言語学習会をオンライン開催しました。",
    content: `
      <p>2025年5月21,22,23日にdiscord上でオンライン学習会を行いました</p>
      <p>21日にC言語, 22日にJavaScript, 23日にPythonの学習会を行いました。</p>
      <p>それぞれ約5-7名ほどのプログラミング初心者が参加し、実際にコードを書きながら学習を進めました。</p>

      <p>今後もLumosでは学習の場を企画していく予定です。</p>
    `,
    image: "/assets/C-program.png",
    category: "プロジェクト",
  },
  {
    id: "3",
    date: "2025年4月中",
    title: "新入生歓迎イベント",
    summary: "4月中に新入生向けの複数のイベントを開催しました。",
    content: `
      <p>2025年4月中に複数の新入生向けイベントを行いました。</p>
      <p>イベント内容はみさきマグロツアーやピザ会、女子会や鎌倉散策などを行いました。</p>
      <p>Lumosに興味がある新入生が多くのイベントに参加してくれました。</p>

    `,
    image: "/assets/shinkan.jpg",
    category: "イベント",
  },
] as NewsItemData[];

// NEWS MANAGEMENT
export const newsService = {
  // Get all news items
  async getAll(options?: { limit?: number; publishedOnly?: boolean }): Promise<NewsItemData[]> {
    if (true) {
      return defaultNews as NewsItemData[]
    }
    try {
      const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

      if (options?.publishedOnly) {
        constraints.push(where('published', '==', true));
      }

      if (options?.limit) {
        constraints.push(firestoreLimit(options?.limit ?? 10));
      }

      const q = query(collection(db, COLLECTIONS.NEWS), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as NewsItemData[];
    } catch (error) {
      console.error('Error getting news items:', error);
      throw error;
    }
  },

  // Get single news item
  async getById(id: string) {
    if (true) {
      const item = defaultNews.find(n => n.id === id);
      return item || null;
    }
    try {
      const docRef = doc(db, COLLECTIONS.NEWS, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...convertTimestamps(docSnap.data())
        } as NewsItemData;
      }
      return null;
    } catch (error) {
      console.error('Error getting news item:', error);
      throw error;
    }
  },

  // Get news item by slug
  async getBySlug(slug: string) {
    if (true) {
      const item = defaultNews.find(n => n.slug === slug);
      return item || null;
    }
    try {
      const q = query(
        collection(db, COLLECTIONS.NEWS),
        where('slug', '==', slug),
        where('published', '==', true)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...convertTimestamps(doc.data())
        } as NewsItemData;
      }
      return null;
    } catch (error) {
      console.error('Error getting news item by slug:', error);
      throw error;
    }
  },

  // Create news item
  async create(data: CreateNewsItem) {
    try {
      const now = serverTimestamp();
      const newsData = {
        ...data,
        createdAt: now,
        updatedAt: now,
        slug: data.slug || createSlug(data.title),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.NEWS), newsData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating news item:', error);
      throw error;
    }
  },

  // Update news item
  async update(id: string, data: UpdateNewsItem) {
    try {
      const docRef = doc(db, COLLECTIONS.NEWS, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      if (data.title && !data.slug) {
        updateData.slug = createSlug(data.title);
      }

      await updateDoc(docRef, updateData);
      return id;
    } catch (error) {
      console.error('Error updating news item:', error);
      throw error;
    }
  },

  // Delete news item
  async delete(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.NEWS, id));
      return id;
    } catch (error) {
      console.error('Error deleting news item:', error);
      throw error;
    }
  }
};

// EVENTS MANAGEMENT
export const eventsService = {
  // Get all events
  async getAll(options?: { limit?: number; publishedOnly?: boolean; upcoming?: boolean }) {
    try {
      const constraints: QueryConstraint[] = [];

      if (options?.publishedOnly) {
        constraints.push(where('published', '==', true));
      }

      if (options?.upcoming) {
        constraints.push(where('eventDate', '>=', Timestamp.now()));
      }

      constraints.push(orderBy('eventDate', options?.upcoming ? 'asc' : 'desc'));

      if (options?.limit) {
        constraints.push(firestoreLimit(options.limit));
      }

      const q = query(collection(db, COLLECTIONS.EVENTS), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as Event[];
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  },

  // Get single event
  async getById(id: string) {
    try {
      const docRef = doc(db, COLLECTIONS.EVENTS, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...convertTimestamps(docSnap.data())
        } as Event;
      }
      return null;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  },

  // Create event
  async create(data: CreateEvent) {
    try {
      const now = serverTimestamp();
      const eventData = {
        ...data,
        createdAt: now,
        updatedAt: now,
        slug: data.slug || createSlug(data.title),
        currentParticipants: data.currentParticipants || 0,
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.EVENTS), eventData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  // Update event
  async update(id: string, data: UpdateEvent) {
    try {
      const docRef = doc(db, COLLECTIONS.EVENTS, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      if (data.title && !data.slug) {
        updateData.slug = createSlug(data.title);
      }

      await updateDoc(docRef, updateData);
      return id;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  // Delete event
  async delete(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.EVENTS, id));
      return id;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
};

// ACTIVITIES MANAGEMENT
export const activitiesService = {
  // Get all activities
  async getAll(options?: { limit?: number; publishedOnly?: boolean; category?: string }) {
    try {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      if (options?.publishedOnly) {
        constraints.push(where('published', '==', true));
      }

      if (options?.category) {
        constraints.push(where('category', '==', options.category));
      }

      if (options?.limit) {
        constraints.push(firestoreLimit(options.limit));
      }

      const q = query(collection(db, COLLECTIONS.ACTIVITIES), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...convertTimestamps(doc.data())
      })) as Activity[];
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  },

  // Get single activity
  async getById(id: string) {
    try {
      const docRef = doc(db, COLLECTIONS.ACTIVITIES, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...convertTimestamps(docSnap.data())
        } as Activity;
      }
      return null;
    } catch (error) {
      console.error('Error getting activity:', error);
      throw error;
    }
  },

  // Create activity
  async create(data: CreateActivity) {
    try {
      const now = serverTimestamp();
      const activityData = {
        ...data,
        createdAt: now,
        updatedAt: now,
        slug: data.slug || createSlug(data.title),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.ACTIVITIES), activityData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  },

  // Update activity
  async update(id: string, data: UpdateActivity) {
    try {
      const docRef = doc(db, COLLECTIONS.ACTIVITIES, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      if (data.title && !data.slug) {
        updateData.slug = createSlug(data.title);
      }

      await updateDoc(docRef, updateData);
      return id;
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  },

  // Delete activity
  async delete(id: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ACTIVITIES, id));
      return id;
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }
};

// SITE CONTENT MANAGEMENT
export const siteContentService = {
  // Get content by key
  async getByKey(key: string) {
    try {
      const q = query(collection(db, COLLECTIONS.SITE_CONTENT), where('key', '==', key));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...convertTimestamps(doc.data())
        } as SiteContent;
      }
      return null;
    } catch (error) {
      console.error('Error getting site content:', error);
      throw error;
    }
  },

  // Set content by key
  async setByKey(key: string, content: string, type: 'text' | 'html' | 'markdown' = 'text') {
    try {
      const now = serverTimestamp();
      const docId = `content_${key}`;

      await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, docId), {
        key,
        content,
        type,
        published: true,
        createdAt: now,
        updatedAt: now,
      });

      return docId;
    } catch (error) {
      console.error('Error setting site content:', error);
      throw error;
    }
  }
};
