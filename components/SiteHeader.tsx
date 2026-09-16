'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { SearchResult } from '@/app/api/search/route';

const RESULT_TYPE_LABELS: Record<SearchResult['type'], string> = {
  article: 'News',
  token: 'Token',
  ecosystem: 'Ecosystem',
  learn: 'Learn',
};

const NAV_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/ecosystem', label: 'Ecosystem' },
  { href: '/tokens', label: 'Tokens' },
  { href: '/news', label: 'News' },
  { href: '/learn', label: 'Learn' },
];

export default function SiteHeader() {
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine the active navigation route.
  // Toggle the mobile navigation menu.

  // Close the search dropdown on outside click or Escape.
  useEffect(() => {
    if (!searchOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [searchOpen]);

  // Autofocus the input whenever the dropdown opens.
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Debounce the query, then hit the search API.
  useEffect(() => {
    if (!searchOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [query, searchOpen]);

  function toggleSearch() {
    setSearchOpen((open) => !open);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  }

  return (
    <header className="site">
      <div className="header-row">
        {/* Site logo and home link */}
        <Link className="logo" href="/" aria-label="Quorum, home">
          <span className="mark">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12L12 4L20 12L12 20L4 12Z"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2.4" fill="#0A0A0A" />
            </svg>
          </span>
          Quorum <span className="chain">Robinhood Chain</span>
        </Link>

        {/* Primary site navigation */}
        <nav
          className={`primary${navOpen ? ' open' : ''}`}
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => {
            const isRoute = !link.href.includes('#');
            const current = isRoute && pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={current ? 'current' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Header actions and mobile menu toggle */}
        <div className="header-actions">
          <div className="search-wrap" ref={searchRef}>
            <button
              className="icon-btn"
              aria-label="Search"
              aria-expanded={searchOpen}
              onClick={toggleSearch}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M21 21L16.5 16.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {searchOpen && (
              <div className="search-dropdown" role="search">
                <div className="search-dropdown-input">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M21 21L16.5 16.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search news, tokens, protocols…"
                    aria-label="Search this site"
                  />
                </div>

                <div className="search-dropdown-results">
                  {loading && (
                    <div className="search-dropdown-status">Searching…</div>
                  )}

                  {!loading &&
                    query.trim().length >= 2 &&
                    results.length === 0 && (
                      <div className="search-dropdown-status">
                        No results for &ldquo;{query.trim()}&rdquo;
                      </div>
                    )}

                  {!loading &&
                    query.trim().length > 0 &&
                    query.trim().length < 2 && (
                      <div className="search-dropdown-status">Keep typing…</div>
                    )}

                  {!loading &&
                    results.map((r) => (
                      <Link
                        key={`${r.type}-${r.id}`}
                        href={r.href}
                        className="search-result"
                        onClick={closeSearch}
                      >
                        <span className="search-result-type">
                          {RESULT_TYPE_LABELS[r.type]}
                        </span>
                        <span className="search-result-body">
                          <span className="search-result-title">{r.title}</span>
                          {r.subtitle && (
                            <span className="search-result-subtitle">
                              {r.subtitle}
                            </span>
                          )}
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>

          <a className="btn-connect" href="/#subscribe">
            <span className="dot" />
            <span className="label">Subscribe</span>
          </a>

          <button
            className="nav-toggle"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
