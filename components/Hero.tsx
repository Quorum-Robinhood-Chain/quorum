import { heroArticle, heroSideArticles } from "@/data/articles";

export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-grid">
        <div className="hero-main">
          <span className="badge">
            <span className="pulse" />
            Breaking
          </span>{" "}
          <span className="badge automated">Automated summary</span>

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
                {heroArticle.desk} · {heroArticle.timeAgo} · Not financial advice
              </span>
            </div>
          </div>

          <div className="hero-figure" aria-hidden="true">
            <svg viewBox="0 0 600 260" width="100%" height="100%">
              <defs>
                <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
                  <path d="M 26 0 L 0 0 0 26" fill="none" stroke="#E5E5E5" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="600" height="260" fill="url(#grid)" />
              <g stroke="#5C7300" strokeWidth="1.4" opacity="0.55">
                <line x1="80" y1="70" x2="230" y2="130" />
                <line x1="230" y1="130" x2="150" y2="200" />
                <line x1="230" y1="130" x2="380" y2="80" />
                <line x1="380" y1="80" x2="500" y2="150" />
                <line x1="380" y1="80" x2="330" y2="200" />
                <line x1="150" y1="200" x2="330" y2="200" />
                <line x1="500" y1="150" x2="330" y2="200" />
              </g>
              <g>
                <circle cx="80" cy="70" r="7" fill="#0A0A0A" />
                <circle cx="230" cy="130" r="10" fill="#D2FF01" stroke="#0A0A0A" strokeWidth="1.6" />
                <circle cx="150" cy="200" r="7" fill="#0A0A0A" />
                <circle cx="380" cy="80" r="9" fill="#0A0A0A" />
                <circle cx="500" cy="150" r="7" fill="#0A0A0A" />
                <circle cx="330" cy="200" r="7" fill="#0A0A0A" />
              </g>
            </svg>
          </div>
        </div>

        <div className="hero-side">
          <h2 className="section-title">Next on the network</h2>
          {heroSideArticles.map((article, i) => (
            <a className="side-story" href={article.href} key={article.id}>
              <span className="num">{String(i + 2).padStart(2, "0")}</span>
              <div className="body">
                <h3>{article.headline}</h3>
                <span className="tag">
                  {article.category} · {article.timeAgo}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
