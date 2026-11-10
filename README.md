# RallyRank V1.43 — Faster Matchday Workflow

## Update type

**Update-only package** for an existing RallyRank V1.42 installation. No database migration required.

Copy only the files in `github-pages/` to the root of your GitHub Pages repository. Do not replace `config.js` or any unchanged assets or JavaScript files. The `supabase/` folder is informational only; do not execute any SQL for this release.

### Updated files

- `github-pages/app.js` — one-tap session settings, round flow and automatic next-round preview
- `github-pages/index.html` — accessible Session Management popup and V1.43 cache/version labels
- `github-pages/styles.css` — popup, mobile layout, workflow cards and next-round controls
- `github-pages/kiosk.html` — V1.43 footer and cache refresh; no kiosk functionality changes

## New daily flow

1. **Start today's session** on **Check-in**. Pick a quick format, or expand optional setup. One session per day; a new day uses new check-ins.
2. **Check in players** from saved profiles. The primary-position counts update as attendance changes. Existing player MMR and profiles remain saved.
3. Tap **Make teams for Round N** to autosort from the saved settings and open a **private team preview** on Live Courts. The preview is not yet visible to players.
4. Review or regenerate the preview, then choose **Publish these teams** and confirm. Live Courts and the kiosk show published rosters; anyone with public scoring access can enter results according to installed Supabase policies.
5. Once **all scheduled matches** have valid recorded results, choose one of two actions, available on Check-in and Live Courts:
   - **Next teams · Same options**: confirm to archive the completed round, keep check-ins, open the new round and immediately generate a **private** preview with all previous settings.
   - **Change options for next round**: confirm to archive the round, open the Session Management popup and make changes by tapping choices. Tap **Make teams** in the popup once you're ready.
6. Repeat for as many rounds as needed **in the same daily session**. Finish Session stays in **Admin** and requires typing `FINISH`.

## Popup settings

**Check-in → Match options** opens the Session Management popup, which provides single-tap (auto-saved) choices for:

- Court 1 / Court 2 team size (2v2 through 6v6)
- 2 or 3 teams on either court independently
- Target score: 15, 21 or 25 (win by two)
- Mixed or competitive/beginner court balancing
- Position balancing, women balancing, and ignore MMR for team creation
- Numbered or funny team names, and whether to show player position preferences

Each setting is saved individually as soon as it's selected, **without a second Save button**. Settings that could change published match rules remain locked while scores are being recorded; finish the round before changing them. If reducing capacity would displace checked-in players, the app blocks the change and explains why.

## Why these actions still require confirmation

Publishing teams makes assignments public. Archiving a completed round changes active round state. Recording and correcting scores changes MMR. Deleting profiles and finishing a session are high-impact actions. The update preserves confirmation steps for these actions; simple settings choices do not require confirmations.

## Behavior carried over from V1.42

- **MMR hidden by default** on admin screens, with opt-in Show MMR for private use.
- Position order and emoji labels consistent on preview, published rosters and kiosk.
- Admin-only preferred-position markings; no extra public preference data.
- Existing position-balancing and Middle/Libero house rules.
- Existing team naming, Undo/Redo by court, score rules and team-count layouts.
- Check-ins persist through rounds; previous rounds retain their records.

## Tests

Run the standalone simulated-browser test with `python tests/test-v143-workflow.py` if you have Playwright + Chromium installed. Tests cover one-tap popup saves, 2+3 court format, five-match round archive, autosort using existing rules, archive/edit/autosort, refusal to advance with unfinished scores, and mobile popup width. The developer additionally checked V1.37 naming, V1.41 position fairness, V1.42 role display, and JavaScript syntax.

**Not verified on your live Supabase project.** A practice round is recommended before event use. If you see an RPC or permission error, confirm your previous V1.40 and V1.41 migrations are installed; V1.43 adds no new RPCs or tables.
