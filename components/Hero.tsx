import Link from 'next/link';
import { Lock } from 'lucide-react';
import { getHeroPresentation } from '@/lib/presenters/articles';

// Fetch the hero article and supporting side stories.
export default async function Hero() {
  const { hero: heroArticle, side: heroSideArticles } =
    await getHeroPresentation();

  return (
    <section className="hero" id="top">
      <div className="hero-grid">
        <div className="hero-main">
          {/* Hero article header */}
          <span className="badge">
            <span className="pulse" />
            Breaking
          </span>{' '}
          {heroArticle.automated && (
            <span className="badge automated">Automated summary</span>
          )}{' '}
          {heroArticle.gated && (
            <span className="badge automated" style={{ color: 'var(--lime)' }}>
              <Lock
                style={{ width: 11, height: 11 }}
                strokeWidth={2.5}
                aria-hidden="true"
              />
              Holder-only
            </span>
          )}
          {/* Hero article details */}
          <Link href={heroArticle.href} className="hero-article-link">
            <div className="hero-lead">
              <h1>{heroArticle.headline}</h1>

              <p className="dek">{heroArticle.dek}</p>

              <div className="hero-meta">
                <div className="avatar-stack" aria-hidden="true">
                  <span className="av" />
                  <span className="av" />
                  <span className="av" />
                </div>

                <span>
                  {heroArticle.desk} · {heroArticle.timeAgo} · Not financial
                  advice
                </span>
              </div>
            </div>

            {/* Hero network visualization */}
            <div className="hero-figure" aria-hidden="true">
              <svg viewBox="0 0 600 260" width="100%" height="100%">
                <defs>
                  <pattern
                    id="grid"
                    width="26"
                    height="26"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 26 0 L 0 0 0 26"
                      fill="none"
                      stroke="#002855"
                      strokeWidth="1.2"
                    />
                  </pattern>
                </defs>

                <rect width="600" height="260" fill="url(#grid)" />

                <g stroke="#CC0000" strokeWidth="1.4" opacity="0.6">
                  <line x1="80" y1="70" x2="230" y2="130" />
                  <line x1="230" y1="130" x2="150" y2="200" />
                  <line x1="230" y1="130" x2="380" y2="80" />
                  <line x1="380" y1="80" x2="500" y2="150" />
                  <line x1="380" y1="80" x2="330" y2="200" />
                  <line x1="150" y1="200" x2="330" y2="200" />
                  <line x1="500" y1="150" x2="330" y2="200" />
                </g>

                <g>
                  <circle cx="80" cy="70" r="7" fill="#FFFFFF" />

                  <circle
                    cx="230"
                    cy="130"
                    r="10"
                    fill="#CC0000"
                    stroke="#FFFFFF"
                    strokeWidth="1.6"
                  />

                  <circle cx="150" cy="200" r="7" fill="#FFFFFF" />
                  <circle cx="380" cy="80" r="9" fill="#FFFFFF" />
                  <circle cx="500" cy="150" r="7" fill="#FFFFFF" />
                  <circle cx="330" cy="200" r="7" fill="#FFFFFF" />
                </g>
              </svg>
            </div>
          </Link>
        </div>

        {/* Supporting network stories */}
        <div className="hero-side">
          <h2 className="section-title">Next on the network</h2>

          {heroSideArticles.map((article, i) => (
            <a className="side-story" href={article.href} key={article.id}>
              <span className="num">{String(i + 2).padStart(2, '0')}</span>

              <div className="body">
                <h3>{article.headline}</h3>

                <span className="tag">
                  {article.category} · {article.timeAgo}
                  {article.gated && (
                    <>
                      {' · '}

                      <span
                        style={{
                          color: 'var(--lime)',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Lock
                          style={{ width: 10, height: 10 }}
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                        Holder-only
                      </span>
                    </>
                  )}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
