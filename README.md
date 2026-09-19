# Selected Items

Smart products, carefully selected for your business.

Selected Items is a centralized product discovery and affiliate platform. Client
websites (cafés, restaurants, salons & spas, gyms) link to it — typically through a
"Selected for You" navigation item — and it recommends relevant products, lets
visitors compare offers from local and international retailers, and sends them
through tracked affiliate links to complete the purchase on the retailer's site.

Selected Items is **not** a business directory or booking marketplace. It never
competes with the businesses that link to it — it only recommends products.

Production domain: `https://selected-items.smartmanager.me`

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) — TypeScript, Tailwind CSS v4
- **Supabase** — Postgres database, Auth (admin login), Storage (product images)
- Row Level Security enforces every access rule at the database layer, not just in
  the app

## Project structure

```
src/
  app/
    (site)/                 Public site (shares Header/Footer layout)
      page.tsx               Homepage
      [activity]/            /cafe, /restaurant, /salon-spa, /gym — one reusable template
      product/[slug]/         Product detail page
      search/                 Site-wide search
    admin/
      login/                  Admin sign-in
      (dashboard)/            Everything behind requireAdmin() — dashboard, products,
                               activities, categories, retailers, networks, offers,
                               traffic sources, clicks, settings
    go/[offerId]/            Buy Now redirect + click tracking (route handler)
    placeholder/[slug]/      Generated placeholder imagery (next/og) for products
                             without an uploaded photo yet
    sitemap.ts, robots.ts
  actions/                   Server Actions (admin mutations)
  components/
    site/                    Public UI (ProductCard, OfferList, FiltersBar, ...)
    admin/                   Admin UI (forms, tables, image uploader, ...)
    ui/                      Shared primitives (Button, Badge, Container)
  lib/
    supabase/                Server / browser / proxy Supabase clients + admin guard
    queries.ts               Server Component data-access layer (public reads)
    database.types.ts        Generated from the live Supabase schema
  proxy.ts                   Next.js 16 "proxy" (formerly middleware): refreshes the
                              auth session, protects /admin, captures ?ref= into a cookie
```

## Data model

`activities` → `categories` → `products` (many-to-many via `product_activities` /
`product_categories`, so one product can appear under several activities) →
`offers` (each referencing a `retailer` and an `affiliate_network`).
`traffic_sources` + `affiliate_clicks` record attribution for every Buy Now click.
See the migrations applied to the Supabase project for the full DDL (schema,
RLS policies, views and functions).

### How affiliate URLs stay hidden and swappable

- The `offers` table has **no public SELECT policy** — anonymous visitors cannot
  read `affiliate_url` or `commission_rate` directly, even via the REST API.
- Public pages read a `offers_public` view instead, which exposes only
  price/currency/retailer/availability — never the URL or commission rate.
- "Buy Now" always links to `/go/[offerId]`, never to the retailer directly. That
  route calls a `SECURITY DEFINER` Postgres function (`record_offer_click`) which
  looks up the real URL, records the click (with traffic-source attribution), and
  redirects — all server-side. Changing an affiliate URL in Admin changes where
  every existing link goes, with no frontend redeploy.

### Admin access without a service-role key

Admin mutations run as the **signed-in admin's own session** (publishable/anon
key + their auth cookie), not a service-role key. Row Level Security checks
`is_admin()` (backed by the `admin_users` table) on every table, so access control
is enforced by Postgres itself, independent of the app code. A
`SUPABASE_SERVICE_ROLE_KEY` is **not required** to run the site or the Admin panel;
it's only useful later for a bulk/automated product-feed importer, and must never
be exposed to the browser.

## Environment variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Get the URL and anon/publishable key from Supabase → Project Settings → API.

## Local development

```bash
npm install
npm run dev
```

## Creating the first Admin user

Admin accounts are real Supabase Auth users that also have a row in
`admin_users`. There's no public sign-up route — the first admin is created once,
by whoever holds the Supabase project:

1. Supabase Dashboard → Authentication → Users → **Add user** (set an email and
   password).
2. Copy the new user's UUID, then run in the SQL editor:
   ```sql
   insert into public.admin_users (id, email, full_name, role)
   values ('<uuid-from-step-1>', '<email>', '<name>', 'admin');
   ```
3. Sign in at `/admin/login`.

Every other admin CRUD screen (products, offers, retailers, activities, etc.) is
managed from within `/admin` itself.

## Deployment

This app needs a real Node.js server, not a static export — it uses Server
Actions (all Admin mutations), Route Handlers (`/go/[offerId]`, `/placeholder`,
`sitemap.xml`), and `proxy.ts` (Next.js 16's middleware, Node runtime only).
`next build` + `next start` runs all of that as one persistent Node process, so
any Node host works, including Hostinger.

### Deploying on Hostinger

Hostinger has two ways to run a Node.js app; either works for this repo as-is
(no `output: "standalone"` or extra config needed — it's driven entirely by
`package.json`'s scripts).

**Option A — Managed Node.js Hosting (simplest):**

1. hPanel → **Websites** → **Add Website** → **Node.js Apps** → **Import Git
   Repository**, authorize GitHub, and select this repo/branch.
2. Set:
   - **Node.js version:** 20 (or later — this repo requires ≥20.9, pinned via
     `engines` in `package.json`)
   - **Install command:** `npm ci`
   - **Build command:** `npm run build`
   - **Start command:** `npm run start -- -p $PORT`
3. Add the environment variables from below in the app's **Environment
   Variables** panel (production values, not the ones in `.env.local`).
4. Deploy. Hostinger builds and starts the app and gives it a URL to verify
   first.
5. Point `selected-items.smartmanager.me` at this Node.js app (hPanel →
   Domains, or your DNS provider if the domain is managed elsewhere: a CNAME/A
   record per Hostinger's instructions for the app), then set it as the app's
   domain in hPanel so SSL gets issued for it.

**Option B — VPS (more control):** provision a Hostinger VPS, install Node 20,
`git clone` the repo, `npm ci && npm run build`, run it with PM2
(`pm2 start npm --name selected-items -- start`), and reverse-proxy it through
Nginx with a Let's Encrypt certificate for `selected-items.smartmanager.me`.
Use this if you need more than one app on the box or custom server config.

**Either way:**

1. Set the three environment variables below to your **production** Supabase
   values (`NEXT_PUBLIC_SITE_URL=https://selected-items.smartmanager.me`).
2. After it's live, confirm the homepage's rendered HTML contains, inside
   `<head>`:
   ```html
   <meta name="mitgo-verification" content="7b4225f7-5ec5-42da-a529-8bcdf03047c6" />
   ```
   (Set in `src/app/layout.tsx` via `metadata.other` — applies to every page,
   including the homepage, and can't be dropped by a page-level override.)
3. If product images fail to render only in production, Next's built-in image
   optimizer (`sharp`) occasionally can't install its native binary on some
   constrained hosts — if that happens, add `images: { unoptimized: true }` to
   `next.config.ts` as a fallback (images still work, just unresized).

No build step touches the database — schema, RLS and demo data already live in
the connected Supabase project, independent of where the app itself runs.

## Demo data

Four activities (Café, Restaurant, Salon & Spa, Gym), their categories, and 15
demo products with realistic multi-country/multi-currency offers are seeded so
the site is fully browsable out of the box. Demo products are flagged
`is_demo = true` and demo retailers/offers use placeholder URLs
(`https://example.com/...`) — replace retailers, networks and affiliate URLs with
real, contracted advertisers from Admin before going live. Nothing fake is
displayed as if it were real (no invented reviews, ratings, traffic numbers or
partnerships).

## What's intentionally not built yet

- Automated product feed import (Admitad/CJ) — the schema (`offers`, distinct
  `affiliate_networks`) is designed so this can be added later without
  restructuring the app; offers are entered manually in Admin for now.
- Visit-level analytics beyond `affiliate_clicks` (per the spec, only real click
  data is shown — no fabricated traffic/conversion numbers).
