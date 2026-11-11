# RallyRank V1.50 — Update Only

**Install over V1.49.** This is a presentation-only update. Matchmaking, score entry, Supabase tables/functions, and configured `config.js` are unchanged.

## Changes

1. **Missing substitutes are obvious:** `Sub needed` rows have a **solid yellow outline** in the private Team Preview, published Live Courts, and the community kiosk. This remains visible when the position-detail toggle is OFF. If assigned positions are enabled and a substitute has a known role, the row continues to show `Needed: <role>`.
2. **Flex correctly counts as a preferred fit (admin-only dots):**
   - **Green dot:** exact primary role **or primary Flex**, meaning any eligible assigned role is an acceptable primary match.
   - **Yellow dot:** exact secondary role **or secondary Flex**, as long as the assigned role did not already qualify as primary.
   - **Red dot:** an assigned role not covered by the player's primary or secondary preferences.
   - Substitute rows get the **yellow outline**, not a role-fit dot.
   - A woman choosing Flex **still cannot be assigned Middle Blocker unless Middle is explicitly her primary or secondary preference**. That existing safeguard remains in the matcher; the display helper also will not mislabel an unauthorized Middle assignment as a green/yellow Flex match.
3. **Primary-role opportunity percentage accounts for primary Flex:** a completed, valid assignment satisfies a primary-Flex player's preference for that session. Secondary Flex does **not** count as receiving a more specific primary position.
4. Both page footers display **V1.50**. Updated `?v=1.50` cache tokens for the edited frontend files and the shared role-display helper.

## Install

1. Back up your current website files.
2. Copy these **six changed files** from the ZIP's `github-pages/` directory to the root of your `vb-autosorter` GitHub Pages repository:
   - `app.js`
   - `styles.css`
   - `team-display.js`
   - `kiosk.css`
   - `index.html`
   - `kiosk.html`
3. **Do not replace your configured `config.js`.** All other files remain untouched, including `matchmaking.js`, `team-names.js`, and `kiosk.js`.
4. Refresh the website and reopen/refresh the kiosk. Check **V1.50** in both footers. On an old kiosk installation, a hard refresh may be needed to fetch the cache-busted stylesheet.

**Supabase changes: NONE. Do not run any SQL for V1.50.** An empty `supabase/` directory is included for release consistency.

## Quick practice checks

- With position balancing ON, generate a preview containing placeholders. Verify every `Sub needed` row has a yellow outlined box. The assigned role, when available, still appears.
- Publish in a practice session and check the yellow substitute outline on Live Courts and the kiosk, both on mobile and larger displays.
- For a player with **primary Flex**, every valid assigned role is marked green. For **secondary Flex** with a different primary role, a non-primary assigned role is yellow. Other autofill assignments remain red.
- Turn the position visibility toggle OFF: assigned-role details disappear on published Live Courts/kiosk, but yellow placeholder outlines remain.
- Confirm scoring, player check-ins and round operations remain unchanged.

## Validation

- `node --check` passed for `app.js` and `team-display.js`.
- 26 helper, percentage, version, release-content, and CSS checks passed in Node.js.
- Chromium visual checks passed for yellow placeholders and green/yellow/red dots on RallyRank and COS themes, light/dark modes, and mobile/desktop kiosk widths.
- Live Supabase behavior was not tested; this update does not change the database.
