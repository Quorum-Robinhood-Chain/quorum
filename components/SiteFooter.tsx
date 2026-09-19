import ConnectWalletButton from '@/components/ConnectWalletButton';
import { newsCategories } from '@/data/news';
import { learnGuides } from '@/data/learn';

export default function SiteFooter() {
  return (
    <footer className="site">
      {/* Footer brand and site description */}
      <div className="footer-grid">
        <div className="footer-col footer-brand">
          <a className="logo" href="/">
            <img src="/logo.png" alt="" className="logo-img" />
            Quorum <span className="chain">Robinhood Chain</span>
          </a>
          <p>
            Independent news and market data for the Robinhood Chain ecosystem.
            Not affiliated with, and not operated by, Robinhood Markets, Inc.
          </p>
        </div>

        {/* Quorum menu: jump to the top of the homepage, or open the wallet modal */}
        <div className="footer-col">
          <h4>Quorum</h4>
          <ul>
            <li>
              <a href="/">Hot News</a>
            </li>
            <li>
              <a href="/news">All News</a>
            </li>
          </ul>
        </div>

        {/* News menu: one link per news theme, deep-linking into /news pre-filtered */}
        <div className="footer-col">
          <h4>News</h4>
          <ul>
            {newsCategories.map((category) => (
              <li key={category}>
                <a href={`/news?category=${encodeURIComponent(category)}`}>
                  {category}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Learn menu */}
        <div className="footer-col">
          <h4>Learn</h4>
          <ul>
            {learnGuides.slice(0, 4).map((guide) => (
              <li key={guide.id}>
                <a href={guide.href}>{guide.shortTitle ?? guide.title}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Copyright and social links */}
      <div className="footer-bottom">
        <span>
          © 2026 Quorum. Not financial advice. Independent coverage of Robinhood
          Chain.
        </span>
        <div className="socials">
          <a href="#" aria-label="X / Twitter">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 4H21L14.5 11.5L22 20H16.3L11.9 14.6L6.8 20H4L11 12L4 4H9.8L13.7 9L18 4Z"
                fill="currentColor"
              />
            </svg>
          </a>
          <a href="#" aria-label="Discord">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="4"
                y="7"
                width="16"
                height="11"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="9.5" cy="12.5" r="1.3" fill="currentColor" />
              <circle cx="14.5" cy="12.5" r="1.3" fill="currentColor" />
            </svg>
          </a>
          <a href="#" aria-label="GitHub">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3C7 3 3 7 3 12c0 4 2.6 7.4 6.2 8.6.5.1.6-.2.6-.5v-1.7c-2.5.5-3-1.1-3-1.1-.4-1-1-1.3-1-1.3-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.8.8.1-.6.3-1.1.6-1.3-2-.2-4.1-1-4.1-4.4 0-1 .3-1.7.9-2.4-.1-.2-.4-1.2.1-2.5 0 0 .8-.2 2.5 1a8.6 8.6 0 0 1 4.6 0c1.7-1.2 2.5-1 2.5-1 .5 1.3.2 2.3.1 2.5.6.7.9 1.5.9 2.4 0 3.4-2.1 4.2-4.1 4.4.3.3.6.8.6 1.7v2.5c0 .3.2.6.6.5C18.4 19.4 21 16 21 12c0-5-4-9-9-9Z"
                fill="currentColor"
              />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
