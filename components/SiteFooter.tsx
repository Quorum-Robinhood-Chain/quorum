export default function SiteFooter() {
  return (
    <footer className="site">
      {/* Footer brand and site description */}
      <div className="footer-grid">
        <div className="footer-col footer-brand">
          <a className="logo" href="/">
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
          </a>
          <p>
            Independent news and market data for the Robinhood Chain ecosystem.
            Not affiliated with, and not operated by, Robinhood Markets, Inc.
          </p>
        </div>

        {/* Network links */}
        <div className="footer-col">
          <h4>Network</h4>
          <ul>
            <li>
              <a href="#">Block explorer</a>
            </li>
            <li>
              <a href="#">Chain status</a>
            </li>
            <li>
              <a href="#">Protocol directory</a>
            </li>
            <li>
              <a href="#">API status</a>
            </li>
          </ul>
        </div>

        {/* Ecosystem links */}
        <div className="footer-col">
          <h4>Ecosystem</h4>
          <ul>
            <li>
              <a href="/ecosystem">Protocols & TVL</a>
            </li>
            <li>
              <a href="/tokens">Trending tokens</a>
            </li>
            <li>
              <a href="/tokens">Stock Tokens</a>
            </li>
            <li>
              <a href="/tokens">DEX volume rankings</a>
            </li>
          </ul>
        </div>

        {/* Editorial links */}
        <div className="footer-col">
          <h4>Editorial</h4>
          <ul>
            <li>
              <a href="#">About Quorum</a>
            </li>
            <li>
              <a href="#">Editorial guidelines</a>
            </li>
            <li>
              <a href="#">Corrections</a>
            </li>
            <li>
              <a href="#">Contact</a>
            </li>
          </ul>
        </div>

        {/* Legal links */}
        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li>
              <a href="#">Not financial advice</a>
            </li>
            <li>
              <a href="#">Sources & attribution</a>
            </li>
            <li>
              <a href="#">Privacy</a>
            </li>
            <li>
              <a href="#">Terms</a>
            </li>
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
