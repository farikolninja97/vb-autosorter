# RallyRank V1.52 — Five-team continuous court rotation

**Install over RallyRank V1.51.** This is an UPDATE-ONLY package, not a full application.

## Installation order

1. Back up your current Supabase project (including player ratings and existing match results) and the GitHub repository.
2. Open Supabase SQL Editor in the **same project configured in your existing config.js**.
3. Run the entire `supabase/upgrade-v1.52.sql` file, once. All earlier required RallyRank migrations (through V1.48, including V1.41 role-history tracking) must already be installed.
4. Copy the SEVEN changed/new files from `github-pages/` to the root of the existing GitHub Pages repository, preserving their names:
   - `app.js`
   - `index.html`
   - `styles.css`
   - `kiosk.js`
   - `kiosk.html`
   - `kiosk.css`
   - `five-rotation.js` **(new required script)**
5. **Do not overwrite `config.js`.** All other current files, including `matchmaking.js`, `team-display.js`, `team-names.js`, `cos-theme.css` and the icon, are unchanged.
6. Refresh the main website and kiosk. Confirm both show V1.52. If using an installed home-screen kiosk, close/reopen or refresh to bypass the old cached files.

## How to use

1. On **Check-in**, choose the new **5-team rotation** quick-start preset for a new daily session, or set Blue Court to **2 teams**, Red Court to **3 teams**, both at **6v6**, then turn on **Five-team continuous rotation** in Match Options.
2. Check in players. Generate and **publish exactly five fixed teams**. Team 1 and Team 2 start on Blue; Team 3 and Team 4 on Red; Team 5 starts on the bench.
3. Enter the final result on **both courts**. Once both are saved, an admin presses **Rotate to next games**. The teams keep their same players, ratings, roles, and global Team 1–5 names.
4. **First transfer:** Blue winner moves to Red, Blue loser stays on Blue against the bench team, Red winner stays on Red, Red loser sits out.
5. **Later transfers:** the team that has just played twice consecutively on Red sits; the team that has just played twice consecutively on Blue moves to Red; the previously sitting team enters Blue. The other two teams stay. Score both games before each transfer.
6. Continue as long as desired. To pick new teams or change settings, use **End rotation & remake teams**, which keeps all check-ins and recorded scores/MMR and returns to a new private preview. This does NOT instantly publish new teams.

### Example (when Team 1 beats 2 and Team 3 beats 4 in the first set)

| Set | Blue | Red | Sitting out |
| --- | --- | --- | --- |
| 1 | 1 vs 2 | 3 vs 4 | 5 |
| 2 | 2 vs 5 | 3 vs 1 | 4 |
| 3 | 5 vs 4 | 1 vs 2 | 3 |
| 4 | 4 vs 3 | 2 vs 5 | 1 |

The sequence after the first set depends on the results of **Set 1**. Later swaps depend on consecutive court appearances rather than the winner of every subsequent match.

## Safeguards and compatibility

- The feature is **OFF by default** and only offered for **Blue 2 teams + Red 3 teams, both 6v6**. Other formats retain their existing scheduling.
- Every set has exactly two matches, one on each court. No new team rosters are generated during rotation. Bench names and current court assignments are displayed on both the main site and kiosk, including kiosk player search.
- Score submission, MMR changes, and Undo/Redo use the existing permission-checked Supabase RPCs. Corrections to the **current** set remain possible. To keep all later rotations consistent, **previous sets cannot be undone after the next set has been created**. Double-check scores before pressing Rotate.
- Ending a rotation archives any completed scores and ratings and keeps check-ins for subsequent team creation. Teams that never actually played a scored game do not get completed-role credit.
- The database migration adds a small rotation-state table, settings RPCs and a guarded scheduler; it increases the match-order range to support a run with many sets. It does not reset existing players or sessions.

## Verification status

- Node.js test: **2,533 assertions passed**, including randomized winner/loser combinations and multiset rotation integrity.
- Mocked-browser tests: main app, mobile width, and kiosk all passed, including the first transfer and bench search.
- JavaScript syntax checks passed; the distributable ZIP passed integrity checks.
- **Not yet verified on the live Supabase project**. The SQL migration was not executed against a real Postgres/Supabase instance in this environment. Run a practice five-team session on the deployed site before a public event.

## Files

`github-pages/` contains only seven changed/new site files. `supabase/` contains `upgrade-v1.52.sql`. `tests/` contains optional test scripts. The root `README.md` is the installation guide.
