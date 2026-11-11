# RallyRank V1.54 — five-team manual/random roster transfers & role-label fix

**Update only** (based on V1.53). This is not a complete standalone website.

## Install in this order

1. **Back up** your Supabase database and current GitHub Pages files. The V1.53 migration must already be installed.
2. In Supabase > SQL Editor, open **`supabase/upgrade-v1.54.txt`**, copy **all its contents**, and run it once. It upgrades the server-side rotation safely and repairs missing assigned positions on currently published five-team rotations.
3. Copy the contents of `github-pages/` into the **repository root** of `https://github.com/farikolninja97/vb-autosorter`, replacing only the matching files:
   - `app.js`
   - `five-rotation.js`
   - `index.html`
   - `styles.css`
   - `kiosk.js` (version footer only)
   - `kiosk.html` (version/cache labels)
4. Do **not** replace `config.js` or any other unchanged file. Nothing changes in `matchmaking.js`, `team-display.js`, `team-names.js`, `cos-theme.css`, or `kiosk.css`.
5. Refresh the GitHub Pages site and your tablet kiosk, confirming both show **V1.54**.

## What changed

### Assigned role stays visible after a player moves

When Balance by position and Show positions on Live Courts & kiosk are **ON**, a player transferred from the outgoing team into an open roster slot keeps a nonempty assigned role. If the slot's role is missing, the server recovers a suitable role from the position data. A woman is **never** assigned Middle Blocker without selecting Middle as a primary or secondary preference. This may leave a warning that the team lacks a Middle specialist, even though all six playing slots are filled.

The Supabase migration also backfills missing roles on an **already-live five-team rotation**, without overwriting nonempty assigned roles. Position visibility still follows the normal Show positions toggle, including in the kiosk.

### Random by default, optional manual transfers BEFORE rotation

Once **both courts have entered their results**, the admin sees these actions left to right:

1. **⏹ End rotation early · Remake teams** (retains current early-end behavior)
2. **👥 Manual transfers** (optional)
3. **↻ Rotate to next games** (primary action)

Manual transfers opens a small dialog. It shows the team **coming OFF the court** and the incoming active teams' **open slots/needed positions**. For any slot, select the specific person who wishes to move. Leave any other selector at **🎲 Random eligible player** to fill that spot automatically. **All Random** immediately clears manual choices in one tap. Click **Use these transfers** to queue choices, then tap **Rotate** to apply them.

The manual plan is an **admin-only, local, unpublished draft** until Rotate is tapped; no player actually moves while editing the dialog. After Rotate, it is applied atomically on Supabase alongside the court rotation. Choices must be made after both results are known because the team coming out depends on the scores. A manual player cannot be selected for two slots. Stale/wrong teams or slots are blocked, and the database also checks that the player still belongs to the outgoing team. Any spaces not manually chosen use randomized role-aware selection rather than a fixed name/ID order.

Players **permanently change teams for this rotation** as in V1.53; they do not become temporary loans. The outgoing team gains yellow "Sub needed" slots for every player who departs. Completed scores, MMR and check-ins remain intact, and nobody appears on two active rosters.

## Verification performed

- **1,190 Node assertions** covering 24–30 registered players, 13 consecutive sets, full active rosters, unique player IDs, manual selection, no duplicate manual transfers, unqualified female Middle restrictions, and roles persisting after moves.
- Browser tests (simulated Supabase) for a two-set flow: manual first, random next; selected player moves to the chosen receiving slot; incoming rosters have six members and assigned role labels; outgoing team shows exact missing spots; kiosk displays 24 assigned roles; responsive desktop/mobile layout; action order and one-tap All Random.
- All three updated JavaScript files passed `node --check`.
- **Live database not tested:** SQL has not been executed against the user's Supabase project. Make a backup and test a full rotation in Demo Mode and a practice live event before an important session. Demo Mode is browser-side and does not itself verify SQL correctness.

`tests/` contains optional runnable checks for maintainers; it does not need to be uploaded to GitHub Pages.
