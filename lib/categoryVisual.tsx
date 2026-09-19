import {
  TrendingUp,
  Network,
  Coins,
  LineChart,
  ShieldCheck,
  BookOpen,
  Newspaper,
  type LucideIcon,
} from 'lucide-react';
import type { ArticleCategory } from '@/types';

export const CATEGORY_VISUAL: Record<
  ArticleCategory,
  { icon: LucideIcon; color: string; image?: string }
> = {
  Markets: {
    icon: TrendingUp,
    color: '#CC0000',
    image: '/categories/markets.jpg',
  },
  Ecosystem: {
    icon: Network,
    color: '#3182CE',
    image: '/categories/ecosystem.jpg',
  },
  Tokens: { icon: Coins, color: '#D69E2E', image: '/categories/tokens.jpg' },
  'Stock Tokens': {
    icon: LineChart,
    color: '#00875A',
    image: '/categories/stock-tokens.jpg',
  },
  Security: { icon: ShieldCheck, color: '#9F7AEA' },
  Learn: { icon: BookOpen, color: '#38B2AC', image: '/categories/learn.jpg' },
};

const FALLBACK_VISUAL = { icon: Newspaper, color: '#CC0000' };

// Return the visual configuration for an article category.
export function getCategoryVisual(category: ArticleCategory) {
  return CATEGORY_VISUAL[category] ?? FALLBACK_VISUAL;
}

// Render the category thumbnail: a themed photo when one is configured,
// falling back to the category icon centered in the thumb container.
export function CategoryThumb({
  category,
  className = 'thumb',
}: {
  category: ArticleCategory;
  className?: string;
}) {
  const visual = getCategoryVisual(category);

  if (visual.image) {
    return (
      <div className={className} aria-hidden="true">
        <img src={visual.image} alt="" className="thumb-image" />
      </div>
    );
  }

  const Icon = visual.icon;

  return (
    <div className={className} aria-hidden="true">
      <Icon color={visual.color} strokeWidth={1.6} className="thumb-icon" />
    </div>
  );
}
