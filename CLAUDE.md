# acp-lending.com — site spec for any AI working on this repo

Read this whole file before changing anything. It is the single source of truth
for how this site is built and changed. If a request conflicts with this file,
follow the request and update this file in the same commit.

## 1. How changes ship
- This repo (stevejwaller/acp-lending, branch `main`) IS the website.
  Every push to `main` auto-deploys to Cloudflare Pages project `acplending`
  (acp-lending.com) in about a minute.
- ALL changes go through a commit to `main`. Never edit through the Cloudflare
  dashboard, never upload a zip to Pages, never publish site content into D1.
- One logical change per commit, with a plain-English message saying what
  changed and why. That is how anything can be rolled back.
- After pushing, verify on the live site (fetch the changed page) before
  calling the job done.

## 2. The base — never reset it
- The current base is commit `f4755de` (2 Nov 2026), also saved as branch
  `saved-2026-11-02`. All work builds on top of `main` as it stands.
- NEVER restore pages from `acplendingsitev61.zip`, any older zip, or any older
  commit. Those wipe later edits (this has happened and was costly).
- NEVER force-push `main`. Never rewrite history.
- Prefer ADDING new files/modules over rewriting existing core pages. Make
  exactly the change requested — nothing extra.

## 3. Locked items — change only with Steve's explicit OK
- Deal Executive Summary report format served by `/deal-analyzer/report`
  (sections: Executive Summary, Property Snapshot, ARV Analysis, Comparable
  Sales Exhibit A, Deal Economics (75%), Liquidity Check, Property Record,
  Pending Exhibits). Do not change its format or route.
- Analyzer loan amount (3 Nov 2026, Steve): 75% only — the lower of the approved
  loan-to-cost (default 90% of purchase + 100% of repairs, owner fields) and 75% of
  ARV. No 70% column. Lender and third-party closing costs (third-party estimated
  at 2.0% of the loan, owner field) sit after the purchase price and are paid at
  closing, never in the loan.
- Header menu (same on every page):
  - Client Tools: Pre-Approval, Deal Executive Summary Analyzer (/analyze-deal),
    DSCR Calculator, Request Financing (/request-financing), Forms, Investor
    Guidance, ACP Investor Brief, Commercial Credit Application, Case Studies.
  - Financing Products: Fix & Flip Bridge, DSCR Rental, Ground-Up Construction,
    Multifamily, Portfolio, Commercial Real Estate Loans.
- Request for Information submissions email Steve only — never the client.

## 4. Content rules
- No lender names anywhere customer-facing (forms, pages, reports). Use
  "Coming Soon" where a lender-routing section would go.
- No borrower or entity names on anything public.
- Every published article/post page says: the full report is on
  acp-lending.com, and investors can sign up at /investor-brief to get new
  reports by email.
- Each video appears on the site only once. Narration says "A-C-P" as letters.
- Customer-facing pages stay short: brief intro + terms chart.

## 5. Technical conventions
- Static HTML + `/css/style.css` + `/js/*.js`; Pages Functions in `functions/`.
  `pages_build_output_dir = "."` — every file in the repo is publicly served,
  so never commit secrets, keys, borrower data or internal notes. Secrets live
  as Pages secrets (e.g. PROPERTYREACH_API_KEY), not in files.
- Cache-busting: bump the `?v=` query on a CSS/JS file in every page that
  loads it when that file changes. `og-image` stays at `?v=2`.
- `_headers` (security headers/CSP) and `_redirects` must not be deleted.
  The CSP allows static.cloudflareinsights.com and challenges.cloudflare.com —
  keep both.
- The Daily Brief (/investor-brief/daily/) is served by the separate
  `acp-brief` worker, not this repo.
- Pages must work at phone width (Steve and his clients use phones).

## 6. Before you finish
- Run through the changed pages on the live site, desktop and phone width.
- Update section 2 of this file if a new saved base is set.
