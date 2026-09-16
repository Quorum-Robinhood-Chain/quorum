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
  { icon: LucideIcon; color: string }
> = {
  Markets: { icon: TrendingUp, color: '#CC0000' },
  Ecosystem: { icon: Network, color: '#3182CE' },
  Tokens: { icon: Coins, color: '#D69E2E' },
  'Stock Tokens': { icon: LineChart, color: '#00875A' },
  Security: { icon: ShieldCheck, color: '#9F7AEA' },
  Learn: { icon: BookOpen, color: '#38B2AC' },
};

const FALLBACK_VISUAL = { icon: Newspaper, color: '#CC0000' };

// Return the visual configuration for an article category.
export function getCategoryVisual(category: ArticleCategory) {
  return CATEGORY_VISUAL[category] ?? FALLBACK_VISUAL;
}

// Render the category icon inside a thumbnail container.
export function CategoryThumb({
  category,
  className = 'thumb',
}: {
  category: ArticleCategory;
  className?: string;
}) {
  const visual = getCategoryVisual(category);
  const Icon = visual.icon;

  return (
    <div className={className} aria-hidden="true">
      <Icon color={visual.color} strokeWidth={1.6} className="thumb-icon" />
    </div>
  );
}

// Render the category icon with optional category color.
export function CategoryIcon({
  category,
  className = 'cat-icon',
  accent = false,
}: {
  category: ArticleCategory;
  className?: string;
  accent?: boolean;
}) {
  const visual = getCategoryVisual(category);
  const Icon = visual.icon;

  return (
    <Icon
      className={className}
      color={accent ? visual.color : 'currentColor'}
      strokeWidth={2.2}
      aria-hidden="true"
    />
  );
}
