# Next.js 16 security upgrade and internal linking — 2026-09-22

## Scope

- Upgraded the site from Next.js 14.2.28 to the patched Next.js 16.3.5 release in two verified stages: 14 → 15.5.25, then 15.5.25 → 16.3.5.
- Did not change Supabase Auth Redirect URL settings or admin magic-link login configuration.
- Improved internal linking for URLs reported as discovered but not indexed. No new public pages or category-specific must-visit pages were created.

## Framework migration

- Updated React, React DOM, and React type packages to 19.3.0.
- Migrated App Router dynamic request APIs to the async contract required by Next 15/16:
  - `params` and `searchParams` in category, review, search, and admin pages.
  - `cookies()` in admin pages, route handlers, and server actions.
- Checked `next/font`, `next/og`, sitemap, and Next config manually. They remain compatible.
- There is no `middleware.ts`, custom webpack configuration, or removed Next 16 config in this project.
- Next 16's generated TypeScript configuration changes were retained (`jsx: react-jsx` and `.next/dev/types` inclusion).

## Indexing/internal-link changes

- The home page already renders every active category returned by `getCategories()`.
- `/must-visit-suphanburi` now renders links to every active category from that same source, replacing the fixed four-category list.
- `/category/[category]` no longer limits its listing to 24 items; every non-deleted review in the category is linked.
- Each review page now renders up to six other reviews in the same category, excludes the current review, and provides a link to the complete category listing.

These are rendered server-side and therefore visible to crawlers without requiring client interaction.

## Verification

| Stage | Typecheck | Tests | Production build |
| --- | --- | --- | --- |
| Next 15.5.25 | Passed | 72/72 passed | Passed |
| Next 16.3.5 | Passed | 72/72 passed | Passed with Turbopack |

- `npm audit --omit=dev --json`: 0 vulnerabilities after the Next 16 upgrade.
- The Next 16 build used non-secret placeholder public environment values only. It compiled, type-checked, generated static routes, and exercised `/admin/manual-content`, `/category/[category]`, `/reviews/[slug]`, `/must-visit-suphanburi`, `/sitemap.xml`, and the OG image route. Data calls returned their existing error/fallback paths because the placeholder Supabase endpoint is not the production database.

## Preview deployment and visual checks

A preview deployment has not been created yet. The local Vercel CLI is logged out and requested device authentication. Do not use a temporary/unlinked deployment because it would not inherit the existing Vercel project's environment variables.

After authenticating the CLI, deploy this branch to the existing project as a preview (without `--prod`) and manually verify:

1. `/admin/manual-content` — existing admin access and form actions.
2. A review URL such as `/reviews/340-food` — related review cards and the category link.
3. `/category/food`, `/category/education`, `/category/event`, and `/category/market` — full listing and every review link.
4. `/must-visit-suphanburi` — every active category chip, including categories added in admin.
5. `/sitemap.xml` and `/opengraph-image` — successful response and expected metadata/image.

## Post-deploy follow-up

Wait 1–2 weeks after deploying, then check Google Search Console Page indexing again. Compare the count of “Discovered – currently not indexed” URLs against the 34 recorded on 2026-09-21, and inspect example URLs including `/category/education`, `/category/event`, `/category/market`, `/reviews/340-food`, and `/reviews/555-food`.