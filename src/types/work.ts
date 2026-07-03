export const workCategories = [
  "Reels",
  "Motion Design",
  "SaaS / Crypto",
  "Courses",
  "YouTube",
] as const;

export type PortfolioCategory = (typeof workCategories)[number];

export type Work = {
  id?: string;
  title: string;
  titleRu?: string;
  category: PortfolioCategory | "Showreel" | string;
  youtubeUrl: string;
  thumbnail?: string;
  description?: string;
  descriptionRu?: string;
  task?: string;
  taskRu?: string;
  format?: string;
  formatRu?: string;
  workDone?: string[];
  workDoneRu?: string[];
  whyItWorks?: string;
  whyItWorksRu?: string;
  deliverables?: string[];
  deliverablesRu?: string[];
  featured?: boolean;
  priority?: number;
};
