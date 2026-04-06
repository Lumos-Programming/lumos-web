export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO date string
  location?: string;
}
