# RallyRank V1.48 — Update Only

**Install on top of your existing V1.47 deployment.** This is not a full replacement of the project or database.

## What's fixed

1. **Substitute positions:** If a team needs a fill-in, the unpublished preview says `Needed: 🧱 Middle Blocker` (or the actual assigned role). Published Live Courts and the kiosk show that role while **Show positions on Live Courts & kiosk** is ON. When OFF, both public displays remain names-only. The migration repairs missing role values on currently published substitute slots and runs the same repair automatically on future publications. It never overwrites an existing position or a real player's role.
2. **Kiosk assigned roles:** Fixed a frontend bug reading `show_player_positions` from the wrong level of the public metadata response. The kiosk now uses the same Supabase session flag as Live Courts. Public viewers never receive MMR or private player preference data from this change.
3. **End Round Early & Remake Teams:** During an unfinished published round, admins see this button in **Check-in** and **Live Courts**. Confirm once, and RallyRank opens the next round with all of today's check-ins and match settings intact and creates a **private team preview**. You must explicitly publish the new teams. You do **not** have to enter scores for unplayed matches.

### What happens to match results when ending early?

- **Already saved scores and MMR changes stay recorded.** An early-ended round with results is archived with its completed and unplayed matches clearly distinguished. Unplayed matches retain `NULL` scores and no winner.
- **No scores recorded:** the unplayed round is discarded rather than counting as a completed/played round. The next round number still advances.
- **Fairness:** only teams involved in a recorded match count as having played together or having completed a preferred-role assignment. The archive separately retains the full originally published team roster for audit, even if other teams did not play.
- The server checks admin authorization, current round number, and completed match count again to protect against another device entering a score in the meantime. If it changed, refresh before trying again.

## Install (SQL FIRST)

1. Back up Supabase and your current GitHub files.
2. In the correct RallyRank Supabase project, run **`supabase/upgrade-v1.48.sql`** once in SQL Editor. This migration REQUIRES the previous V1.47 (and earlier) migrations.
3. Copy the changed files in **`github-pages/`** to the root of your GitHub Pages repository, replacing their previous versions:
   - `app.js`
   - `index.html`
   - `styles.css`
   - `kiosk.js`
   - `kiosk.html`
   - `kiosk.css`
4. Do **NOT** replace or re-upload `config.js`, `matchmaking.js`, `team-display.js`, `team-names.js`, or other unchanged files.
5. Refresh both site and kiosk. If an installed kiosk app retains its old version, close and reopen it or clear that site's cache. The footer should show **V1.48**.

## Test after deployment

1. Enable position balancing and **Show positions on Live Courts & kiosk**. Create a practice round with 28 checked-in players / 36 court spots. Confirm substitutes show `Needed: [position]` in both Live Courts and kiosk, and existing players show `Assigned: [position]` in the kiosk.
2. Turn Show positions OFF and verify the public Live Courts and kiosk hide **both** assigned roles and needed substitute roles. The admin Team Preview still shows assigned roles for review.
3. Publish a test round, record **one** score, then choose **End Round Early & Remake Teams**. Confirm that score and MMR remain, the other matches are unscored, all check-ins persist, and a new private preview appears.
4. Try ending an unscored test round, and test one 2+3 court format as well. After a completed round, the regular **Next Teams** path remains available.

## Verification scope

Passed: JavaScript syntax, randomized 2/3-team matchmaking, local browser tests for role-label ON/OFF, preview and published substitutes, one-score and zero-score early remakes, and a 2+3 mixed court configuration. **The SQL migration has not been executed against your live Supabase database**; test there before using it at an event.
