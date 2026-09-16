import { Big_Shoulders_Display, Public_Sans } from 'next/font/google';

// Shared by both root layouts (public site + admin) so the two stay in sync.
export const displayFont = Big_Shoulders_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-big-shoulders',
  display: 'swap',
});

export const bodyFont = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-public-sans',
  display: 'swap',
});

/** Class string to put on <html>. */
export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
