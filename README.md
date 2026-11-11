# RallyRank V1.51 — Update Only

Install **over V1.50**. This release combines the Check-in player-browser improvement with session-wide fairness for people who need to play outside their preferred positions. Both improvements require a fresh JavaScript deployment; the database schema stays unchanged.

## Changed features

### 1. Check-in: browse all available players

- Tap or focus an **empty** Check-in search field to see **every currently unchecked player** in an alphabetized, scrollable dropdown.
- An **All available** control opens or closes the list without making you type. Useful on tablets with an on-screen keyboard.
- Tap a player to check them in. The browser remains open so you can keep checking others in; it preserves your scroll position.
- As soon as you type a name, RallyRank uses the existing ranked search capped at ten results. Clear the text to browse everyone again.
- Already checked-in players are omitted only from empty-query browsing, not from typed search, where they can still appear as already checked in.
- Admin permissions, capacity limits, overflow mode and existing attendance data are unchanged.

### 2. Rotate unavoidable autofill assignments

- When **Balance teams by volleyball position** is enabled, the team generator reads the **existing per-player position history from completed/archived rounds of this daily session**.
- An **autofill** means a player received an assigned role that is neither their primary nor secondary preference. Primary **Flex** and secondary **Flex** count as valid preferred matches, not autofills, consistent with green/yellow role dots.
- If somebody must cover an unfamiliar position, the sorter **strongly favors players with fewer previous autofills** over somebody who has already covered one or more. It also compares candidate team layouts to spread the fill burden across teams.
- It does **not** give someone an unnecessary out-of-position role just to even up totals, and it preserves the rule that a woman can play Middle Blocker **only if Middle is listed as her primary or secondary role**.
- The fairness rule is best effort, not mathematically absolute: a repeat can be necessary when there are too few eligible players, the role combination is infeasible, or a player is not in this round (e.g. overflow). Position balancing OFF still means no role assignment or role-fairness calculation.
- History tracking requires the earlier **V1.41** feature to already be installed; no new SQL in V1.51. Unrecorded and unassigned roles do not count as autofills.

## Installation

1. Back up your current GitHub Pages files.
2. Copy the **five changed files** from `github-pages/` to your `vb-autosorter` repository root, replacing only those filenames:
   - `app.js`
   - `matchmaking.js`
   - `styles.css`
   - `index.html`
   - `kiosk.html`
3. **Do not overwrite `config.js`** or replace the unchanged `team-display.js`, `team-names.js`, `kiosk.js`, `kiosk.css`, or theme assets.
4. Refresh the main website and kiosk; verify both show **V1.51**. The HTML also includes a fresh cache token for `matchmaking.js` so clients retrieve the new fairness logic.

**Supabase migration: NOT REQUIRED.** The `supabase/` folder is intentionally empty. V1.41's existing admin-only role-history RPC is reused.

## Verified locally

- JavaScript syntax checks passed.
- Node regression tests cover previous autofill counts, Flex preferences, the women/Middle eligibility safeguard, team assignments, 2+3 courts, and search logic.
- Three simulated 36-player rounds completed with role history carried across rounds and no repeat autofills in that sample.
- Chromium browser test passed on a 390px phone viewport and desktop: open all unchecked players, scroll, check someone in, retain the list/scroll position, typed 10-result search, accent-insensitive search, Escape, and mobile overflow.
- The SQL migration and live Supabase multi-device flow were **not** executed against your production project.
