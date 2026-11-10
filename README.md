# RallyRank V1.47 — Update Only

**Base:** RallyRank V1.46 (install all prior database upgrades through V1.41 first).  
**Deployment:** GitHub Pages + Supabase.  
**Important:** `config.js` is deliberately **NOT** included. Preserve your existing configuration and credentials.

## What's new

### 1) One-tap final score entry
- On Live Courts and Kiosk, entering a valid final score and pressing **Save** submits it directly. There is no second confirmation dialog.
- Score validation (15/21/25 targets, win by two), disabled duplicate submissions, and per-court Undo/Redo remain intact.
- Publishing teams, archiving a round, and destructive actions still require their existing confirmations.

### 2) Optional randomized overflow players
- **Off by default**. From admin Check-in, open **Match Options > Overflow (optional)** and turn it **On** if more players are checked in than the court capacity.
- Up to 96 players may stay checked in for the day when enabled. Court capacity is unchanged; an over-capacity group does not create extra teams.
- Every **Make Teams** or **Generate different teams** action uses a fresh random selection of court players. Everyone else appears under **Overflow** in Team Preview and, after publishing, on Live Courts and Kiosk.
- Overflow participants stay checked in and eligible for the next round. Random selection is **not a guarantee** that every individual will play an equal number of rounds.
- The feature is non-disruptive when attendance is within capacity; the original publishing functions are used in that case.
- Turning Overflow off is blocked while attendance still exceeds capacity.

### 3) Balance women across teams ON for new daily sessions
- Fresh daily sessions now start with **Balance women across teams: On**.
- The setting can be turned **Off** (or back On) with one tap in Match Options before publishing.
- Existing daily sessions and their current choices are **not overwritten**.
- Balancing uses the existing opt-in profile gender data and does not change the Middle Blocker restriction.

### 4) Check-in improvements
- The new-player shortcut returns to Check-in after successful profile creation.
- With Overflow off and court spots full, new profiles can still be created, but automatic check-in is prevented until space is available.
- With Overflow on, check-ins can go beyond court capacity (up to the daily cap), including adding a new profile and checking them in.
- Demo's 36-player and 28-player shortcuts return to Check-in, rather than Admin.

## Installation (important order)

1. **Back up your Supabase database and GitHub repository**. Verify you are in the Supabase project connected to your website's existing `config.js`.
2. Run the complete `supabase/upgrade-v1.47.sql` once in **Supabase SQL Editor**. The SQL is non-destructive: it does not erase existing players, stored ratings, or match history.
3. Upload **only the six files** in `github-pages/` to the **root** of `https://github.com/farikolninja97/vb-autosorter`, replacing the matching files:
   - `app.js`
   - `index.html`
   - `styles.css`
   - `kiosk.js`
   - `kiosk.html`
   - `kiosk.css`
4. **Do not delete or overwrite** `config.js`, `matchmaking.js`, `team-display.js`, `team-names.js`, `cos-theme.css`, kiosk assets, or other unchanged files.
5. Reload the website/kiosk, bypassing cache if necessary. Both should read **V1.47**.

## Quick smoke test (Demo Mode)

1. Start a new practice day; confirm **Balance women across teams = On**. Turn it Off and On again to verify the selection.
2. On Check-in, verify full 6v6 capacity is 36 (3+3 teams), then enable Overflow in Match Options.
3. Check in 39 players and choose Make Teams. Six teams of six should be created, with three overflow names.
4. Click **Generate different teams** and verify the overflow group is redrawn. Publish and verify overflow names appear on Live Courts and Kiosk.
5. Enter all six match scores and confirm each takes **one Save** without an additional Yes/OK dialog.
6. Choose **Next Teams · Same options**. Verify all 39 players are still checked in and three overflow players are chosen again.
7. Turn Overflow off only after attendance is at or below court capacity.

## Verification / limits

- Passed locally: JavaScript syntax checks; court-format randomized matchmaking tests (2+2, 2+3, 3+2, 3+3); daily session creation; adding and checking in players; women's balancing default and On/Off toggle; 39-for-36 overflow draw and regeneration; publishing; direct score submissions; next-round check-in retention; kiosk score-entry; no new confirm dialog; previous roles and display tests.
- **Not verified against the live Supabase project**. Always test the new SQL and a practice round before a real event.
- Keep a backup in case any earlier migrations or custom SQL differ from the expected RallyRank schema.
