import { Article, ArticleCategory } from '@/types';
import {
  heroArticle,
  heroSideArticles,
  latestNews,
  marketCards,
} from '@/data/articles';

// Full news archive; dedup by id since rails can overlap.
const combined: Article[] = [
  heroArticle,
  ...heroSideArticles,
  ...marketCards,
  ...latestNews,
];

const seen = new Set<string>();
export const newsArchive: Article[] = combined.filter((article) => {
  if (seen.has(article.id)) return false;
  seen.add(article.id);
  return true;
});

export const newsCategories: ArticleCategory[] = [
  'Markets',
  'Ecosystem',
  'Tokens',
  'Stock Tokens',
];
