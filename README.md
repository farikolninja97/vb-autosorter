# RallyRank V1.49 — Update Only

**Install on top of V1.48.** This is a frontend-only patch.

## Changes

1. **Small role-fit dots instead of colored name outlines** in admin Team Preview and admin-visible published rosters. No more highlighted lettering or full-row outlines.
   - **Green ●** = assigned role matches primary position.
   - **Yellow ●** = assigned role matches secondary position.
   - **Red ●** = assigned role was autofilled outside the preferred roles.
   The published roster's existing bullet is colored rather than adding a duplicate bullet. Public players do not see private preference-fit data.
2. **Primary-role opportunity percentage** replaces the awkward `Primary role fairness: X/Y` text in Team Preview. This shows what percent of players in the proposed teams **who have not yet received their primary-position assignment this daily session** would receive their primary role in this proposed round. Example: 2 of 3 waiting players => **67%**. A 100% reading when nobody remains waiting explicitly says so. The indicator is hidden when position balancing is off. This is a preview measure, not a guarantee that everybody gets their preference.
3. Both main and kiosk footer labels display **V1.49**.

## Install

1. Open the ZIP. Copy **only** these files from `github-pages/` into the root of your `vb-autosorter` GitHub Pages repository, replacing their older versions:
   - `app.js`
   - `styles.css`
   - `index.html`
   - `kiosk.html` (version footer only; kiosk logic remains unchanged)
2. **Keep your existing `config.js`** and all other files, including `matchmaking.js`, `team-display.js`, `team-names.js`, kiosk code, and assets. Never reset or replace the database.
3. Refresh the website and check that the footer says **V1.49**. If cached on a tablet, close and reopen the kiosk.

**Supabase changes: NONE. No SQL migration is required.**

## Quick test

1. In Demo Mode enable positional team balancing, generate a private team preview, and confirm one green/yellow/red dot is shown to the left of each real player as appropriate; placeholders have no dot.
2. Confirm there are no colored outlines on the lettering or around player rows.
3. Confirm the preview shows `Primary-role opportunity: 67%` for a scenario where 2 of 3 still-waiting players would receive their primary position. The explanatory count should match the percentage.
4. Publish a practice round with position display enabled; admin-published rosters should have **one** colored bullet per player, not two. Public viewers must not see preference-fit colors.
5. Turn **Balance teams by volleyball position** off; the percentage and role-fit indicators are not shown. Existing score, MMR, and round workflow are unchanged.

## Checks performed

- `node --check` passed for edited `app.js`.
- 12 logic, version, and style checks passed (`tests/verify-v149.cjs`).
- Chromium style/layout tests passed for green/yellow/red indicators, no colored text strokes, one published bullet, and light/dark COS theme at mobile width.
- Full live Supabase behavior was not tested; these files do not change any database functions.
