# RallyRank V1.45 — Live Courts position display & MMR control fix

**Apply on top of V1.44**, with the V1.41 and earlier SQL migrations already installed. This is a **frontend-only update**.

## Changes

- **Removed the MMR hidden/show button from the global page header.** Team Preview keeps its own Show/Hide MMR control. To preserve existing admin functions, there are small contextual MMR controls inside Admin → Edit player profiles, Rankings, and the private Live Courts match-rating section. All are hidden by default on page load and reset to hidden when navigating to another tab. Preview MMR also resets when the draft is discarded or teams are published.
- **Fixed the Live Courts position visibility setting.** Previously, `Show primary / secondary preferences` hid only the preference line, while **Assigned:** positions still appeared. The setting is now explicitly **Show positions on Live Courts & kiosk**:
  - **OFF:** Published Live Courts and the community kiosk display **names only**, without assigned positions, primary/secondary preferences, role-specific outlines, or admin specialist warning icons.
  - **ON:** When position balancing is enabled, published Live Courts show assigned positions (with their emojis), primary/secondary preferences, and admin-only role outlines/icons; kiosk shows assigned positions.
  - The private **Team Preview** still shows assigned positions for admins regardless of published visibility.
  - Turning **Balance by volleyball position** OFF also hides the published position details regardless of the separate visibility setting.
- Public visibility continues to be controlled by the existing admin-checked `vmm_set_show_player_positions` RPC; no changes to role assignment, player data, MMR math, check-ins, matches, or permission checks.
- Updated main and kiosk version footers and cache-busting queries to **V1.45**.

## Installation

1. Keep a backup of your working V1.44 site and database.
2. From `github-pages/`, copy **only these five changed files** into the root of `https://github.com/farikolninja97/vb-autosorter`:
   - `app.js`
   - `styles.css`
   - `index.html`
   - `kiosk.js`
   - `kiosk.html`
3. **Do not replace `config.js`.** Keep `matchmaking.js`, `team-names.js`, `team-display.js`, `cos-theme.css`, other assets, and configured Supabase credentials unchanged.
4. Force-refresh the main site and kiosk (especially on a cached Android tablet) and verify both show **V1.45**.
5. Admin → Check-in → **Match options** → **Display** → **Show positions on Live Courts & kiosk**. Tap **Off** to show names only, or **On** for position details. Saving is automatic.

## Supabase

**No Supabase SQL migration is required for V1.45.** Existing V1.24+ permission-controlled preference visibility and V1.41 database support remain in use.

## Checks performed (local, simulated—not live Supabase)

- JavaScript syntax: `app.js`, `kiosk.js` — passed.
- Browser: header MMR removed, published Live Courts OFF → ON → OFF, including assigned and primary/secondary details and colored outlines — passed.
- Browser: kiosk OFF → ON → OFF while position balancing stays ON — passed.
- Browser: Demo Team Preview Show MMR, automatic hiding on navigation/discard, and contextual Admin MMR editing still available — passed.
- Existing V1.43 one-tap settings, five-match round flow, change options, incomplete-round safety, mobile settings modal — passed.
- Existing role fairness, team names, role order, and multi-round tests — passed.

**Limit:** the production Supabase database and real multi-device sync were not exercised. Test the new switch with a demo or practice session before an event.
