"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Nav: Governance/Staking → Ecosystem/Tokens; "Connect Wallet" → Subscribe.
// Active item derived from pathname.
const NAV_LINKS = [
  { href: "/markets", label: "Markets" },
  { href: "/ecosystem", label: "Ecosystem" },
  { href: "/tokens", label: "Tokens" },
  { href: "/news", label: "News" },
  { href: "/learn", label: "Learn" },
];

export default function SiteHeader() {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="site">
      <div className="header-row">
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

        <nav className={`primary${navOpen ? " open" : ""}`} aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const isRoute = !link.href.includes("#");
            const current = isRoute && pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={current ? "current" : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <button className="icon-btn" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <a className="btn-connect" href="/#subscribe">
            <span className="dot" />
            <span className="label">Subscribe</span>
          </a>
          <button
            className="nav-toggle"
            aria-label={navOpen ? "Close menu" : "Open menu"}
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
