import { ARTICLE_CATEGORIES, type ArticleCategory } from '@/types';

// Filter chips on /news. "Security" and "Learn" exist as categories but aren't offered
// as filters yet — keep this list in sync with what the desk actually publishes.
export const newsCategories: ArticleCategory[] = ARTICLE_CATEGORIES.filter(
  (category) => category !== 'Security' && category !== 'Learn',
);
