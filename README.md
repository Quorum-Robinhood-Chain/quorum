# Quorum (Next.js)

News & market-data frontend for Robinhood Chain. Next.js 14 (App Router) + TypeScript + Tailwind.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Structure

```
app/(site)/     public pages: home, markets, news, ecosystem, tokens, learn
app/(admin)/    /admin review queue (separate layout, no header/footer)
app/api/admin/  login/logout routes
components/     UI components
data/           mock data (swap for real APIs later)
lib/            admin-auth (HMAC session cookie)
middleware.ts   guards /admin routes
```

## Admin

- URL: `/admin`
- Login: `admin` / `quorum2026` (override via `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`)
- Approve/reject buttons are local state only — not wired to a backend yet.

## Notes

- Data in `data/` is placeholder — replace with real APIs (DefiLlama, DEX subgraphs, Chainlink, Morpho, news ingestion) when ready.
- `npm run build` needs internet access for Google Fonts.
