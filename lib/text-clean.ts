// Removes em dashes (and their look-alikes) from generated article text.
//
// Applied when an article is saved (lib/llm/generate.ts), so every reader of
// the database (pages, cards, search, metadata, admin) gets clean text.
// Keep the regexes in sync with the backfill migration
// prisma/migrations/20260919000000_strip_em_dashes.
//
// Handled: em dash (—), horizontal bar (―), double hyphen (--), and an en
// dash used as a spaced dash ( – ). Not touched: en dashes between numbers
// or words without spaces (ranges like 5–10) and normal hyphens.

// Matches a dash plus the spaces/tabs around it (never newlines).
const DASH = /[ \t]*(?:—|―|--)[ \t]*|[ \t]+–[ \t]+/g;

function tidy(text: string): string {
  return text
    .replace(/,[ \t]*,/g, ',') // ", ," -> ","
    .replace(/,[ \t]*([.!?:;])/g, '$1') // ", ." -> "."
    .replace(/[ \t]+([,.!?:;])/g, '$1') // " ," -> ","
    .replace(/[,:][ \t]*$/gm, '') // dangling separator at end of a line
    .trim();
}

/** Body / dek: every dash becomes a comma. */
export function stripDashes(text: string): string {
  return tidy(text.replace(DASH, ', '));
}

/** Headline: the first dash becomes ": ", any further one a comma. */
export function stripDashesHeadline(text: string): string {
  let first = true;
  const out = text.replace(DASH, () => {
    if (first) {
      first = false;
      return ': ';
    }
    return ', ';
  });
  return tidy(out);
}
