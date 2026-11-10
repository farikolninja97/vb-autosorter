# RallyRank V1.41 — Preferred-Role Fairness and Middle Backup

Delta/update-only release for **RallyRank V1.40**. No full-site replacement; preserve your configured `config.js` and unchanged files.

## What changes

- **Outside → Middle shortage coverage:** When a six-player team lacks a preferred Middle Blocker, the assignment algorithm can put an eligible Outside Hitter at the front-row Middle spot. It prefers explicit primary/secondary Middle preferences over this fallback and considers Flex/other options when necessary.
- **Women/MB safeguard unchanged:** A player whose recorded gender is `Woman` can be assigned Middle **only** if `Middle Blocker` is their primary or secondary position. Outside Hitter or Flex alone does not qualify. The existing V1.40 SQL trigger still enforces this on the server.
- **Primary position at least once per daily session, when feasible:** Newly archived rounds record each real player's assigned role. Next-round matchmaking prioritizes players who have **not yet received their primary position** today, including spreading crowded positions (such as Outside Hitters) across teams, and takes previously fulfilled preferences into account when choosing who fills shortage roles.
- **Admin preview:** Shows how many of the players still awaiting a primary-position assignment would receive it in the next proposed round and how many would still be waiting. The existing two warning icons (🎯 missing *primary* Setter, 🧱 missing *primary* Middle) are unchanged, and remain admin-only.
- **Position balancing OFF:** All assigned roles and their display remain OFF, and preference fairness does not apply in that mode. The Check-in primary-position counts remain usable. MMR Ignore option, daily check-ins, team counts, 6v6 house rules, funny names, and per-court scoring are unchanged.

### Important limits

The goal is **best-effort, not an unconditional guarantee**. For example, 15 primary Outside Hitters competing for ten Outside slots in a five-team round need additional rounds for everybody to receive an Outside assignment. The app can record **assigned roles**, not verify what players physically did on court. Primary roles `Flex` and `Unspecified` have no single fixed role to fulfill; their secondary preference remains a useful tie-breaker. Archived rounds **before installing V1.41** have no recoverable role assignments in the older SQL archive format, so preference-history tracking begins with rounds archived **after** the migration. The history resets automatically with the next day's distinct event/session ID; it is never based on MMR.

## Install — follow this order

1. **Back up Supabase and your current GitHub Pages files.** Confirm you're running V1.40 with its earlier migrations installed.
2. Open **Supabase → SQL Editor** and execute `supabase/upgrade-v1.41.sql` in full. It creates a private archive-triggered role-history table and one admin-only read RPC; it does **not** alter player profiles, match scoring, MMR, existing check-ins, or existing archives.
3. Upload only the five files in `github-pages/` to the **repository root** of `farikolninja97/vb-autosorter`, replacing matching files. They are `app.js`, `matchmaking.js`, `index.html`, `kiosk.html`, `kiosk.js`.
4. **Do not copy or replace `config.js`.** Keep the existing `styles.css`, `cos-theme.css`, `kiosk.css`, `team-names.js`, and all other assets.
5. Refresh the public site and kiosk. Both footers must read **V1.41**.
6. Under **Live Courts → Session Management**, enable **Balance teams by volleyball position**. Use a no-stakes day/test session to publish scores, finish a complete round, click **Start next round**, and preview again. The next preview should prioritize those who have not yet received their primary role.

## Tests

- `node tests/test-v141-role-fairness.js`: 11 compatibility scenarios for dedicated Middle, eligible Outside fallback, women/MB restriction, secondary MB, missing eligible Middle, Flex rotation, 2+2/2+3/3+2/3+3 and disabled position balancing.
- `node tests/test-v141-multi-round.js`: 30-player, five-team, **15 Outside Hitters** example; all receive their primary assignment across two completed/archived rounds in this test setup.
- `python tests/test-v141-browser.py`: simulated admin browser flow with position balancing ON/OFF, daily 2+3 session, private role-history RPC, and preference-progress display. **Run only after merging** with the unchanged site assets including `styles.css` and `team-names.js`.
- Previous V1.40 Node compatibility checks and simulated kiosk visibility regression also passed locally.

**Live Supabase migration and multi-device score entry were not executed in this environment.** Run the migration before the frontend upload and verify the complete workflow with a practice event.

## Package contents

- `github-pages/` — only the five changed site files
- `supabase/upgrade-v1.41.sql` — required, non-destructive migration
- `tests/` — optional regression tests
- `README.md` — installation instructions
