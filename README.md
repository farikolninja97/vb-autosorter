# RallyRank V1.44 — Team Preview Fix, MMR Toggle, Preference Outlines

**Upgrade from:** RallyRank V1.43 (which already includes the V1.41 SQL migration).

## Changes

- Fixed the **Demo Mode / Team Preview** sentence to display the real team count, instead of the literal `${groups.length}` placeholder.
- Added a **Show MMR / Hide MMR** button in the admin-only Team Preview header. MMR is hidden by default on every page load. The existing header toggle controls the same temporary visibility setting. Matchmaking and scoring are unchanged.
- MMR may be shown for inspection even if "Ignore MMR when creating teams" is enabled. Ignore MMR only affects team generation, not rating visibility.
- Removed the per-player `✓ Primary` and `◇ Secondary` tags. Team Preview and the admin-only published Live Courts roster now use **yellow outline = assigned primary position**, **blue outline = assigned secondary position**, **red outline = autofilled (assigned position doesn't match primary or secondary)**. Sub placeholders and unassigned players do not receive a preference outline.
- Added a compact color key above the preview teams, plus hover/assistive descriptions on highlighted rows.
- Highlighting is hidden when position balancing is disabled. The public kiosk does not receive the private preference fields.
- Updated main and kiosk version labels to V1.44.

## Install (update-only)

1. Keep a backup of your currently working V1.43 files.
2. Copy the **four files** under `github-pages/` to the **repository root** of `farikolninja97/vb-autosorter`:
   - `app.js`
   - `styles.css`
   - `index.html`
   - `kiosk.html`
3. **Keep your configured `config.js`**, your current `team-display.js`, `matchmaking.js`, `team-names.js`, and every other unchanged file.
4. Refresh/force-refresh the live page and the kiosk; confirm **V1.44** in the footer.

**Supabase migration: NONE.** All changes are frontend display-only.

## Verification performed (local only)

- `node --check` on app.js — PASS.
- Existing role-balancing and team naming tests — PASS.
- Existing V1.43 mock-Supabase browser flow tests (session popup, round archive, regenerate, mobile layout) — PASS.
- New Playwright browser test in **demo mode** — PASS: real preview count and default-hidden/toggleable MMR.
- New Playwright browser test with simulated published roles — PASS: yellow primary, blue secondary, red autofilled; no Primary/Secondary tags.

These checks do **not** validate the live Supabase project or live multi-device behavior. Try in Demo Mode and refresh the live site before an event.

## Tests

`tests/test-v144-demo-preview.py` uses the existing `tests/test-v143-workflow.py` helper and Chromium/Playwright, run from a completed repository tree containing all required unchanged supporting files.
