import { Oswald, Public_Sans } from 'next/font/google';

// Shared display font used across the public site and admin layout.
export const displayFont = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-big-shoulders',
  display: 'swap',
});

// Shared body font used across the public site and admin layout.
export const bodyFont = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-public-sans',
  display: 'swap',
});

/** Combined font variables applied to the root <html> element. */
export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
