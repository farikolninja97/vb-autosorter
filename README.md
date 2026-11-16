# RallyRank V1.57 — Cumulative Update-Only ZIP (V1.55 + V1.56 + V1.57)

**Install directly over V1.54 or any newer version.** This release contains the changes that were waiting to deploy in V1.55 and V1.56, plus the new V1.57 bulk registration check-in flow. There is no need to install V1.55 and V1.56 separately.

## V1.57 — Bulk Check-in from Registration

On the admin **Check-in** page, choose **Bulk check-in from registration**.

1. **Paste** names copied from the registration site's *Player roster*, one name per line, and tap **Match names**. Alternatively, choose **Import screenshot** and select a screenshot of that roster. Recognition runs locally in your browser with the optional Tesseract.js library; it needs an internet connection to load the OCR script/language pack and may misread names. Always review the results.
2. **Ready to check in** shows confident matches against your existing RallyRank profiles, with preselected checkboxes. Full name to abbreviated saved name is supported, e.g. `Trenner Nolan` or `Trenner Noland` → `Trenner N.`.
3. **Possible matches** shows uncertain or ambiguous suggestions, such as multiple players named `Chris J.`. Nothing is selected in this section until you review and approve the correct existing profile.
4. **Names not found** collects people who need spelling corrections, manual selection from all saved profiles, or **Create new profile**. The new-profile form is prefilled and returns you to the same bulk review once created. The existing single-player Check-in search remains unchanged.
5. Tap **Check in N selected** once. It submits only selected saved player IDs through the existing secure admin check-in logic, does not check in an existing player twice, and respects attendance capacity and the optional overflow setting.

Duplicate registration lines are ignored. Multiple registration names assigned to the same saved player block submission until corrected. Already-checked-in players appear in their own section. Bulk check-in and registration name data are visible only to admins and are not transmitted to Supabase except for selected existing player IDs (or a new profile you explicitly create). Unsubmitted registration text is not persisted to the database.

## Included V1.56 display improvements

- **Assigned position first**, then optional primary/secondary preferences, on Team Preview and published courts/kiosk when enabled.
- Primary/secondary visibility respects the session setting. Published courts/kiosk hide all position details when disabled; private preview retains assigned roles for admins.

## Included V1.55 rotation fixes

- Five-team rotation defaults to position balancing and assigned-position display enabled.
- **Show & restore assigned positions** can repair role labels in an already-running rotation without changing scores, MMR, check-ins, or court progression.

## Files

```text
README.md
github-pages/
  app.js                    ← cumulative V1.55–V1.57
  index.html                ← V1.57 registration dialog and version
  registration-match.js     ← new client-side fuzzy matcher (required)
  styles.css                ← cumulative V1.55–V1.57
  kiosk.html                ← cumulative V1.55–V1.57
  kiosk.js                  ← V1.56 kiosk role layout and V1.57 version
  kiosk.css                 ← cumulative V1.56 kiosk styling
supabase/
  upgrade-v1.55.txt         ← pending V1.55 SQL; no new V1.57 SQL

tests/
  test-v155-demo.py
  test-v156-role-order.py
  test-v157-bulk.py
  test-v157-matching.cjs
```

Only the **seven website files needed to update from V1.54** are included. Other files are unchanged. **Do not overwrite your configured `config.js`.**

## Deploy

1. **Back up Supabase.** Ensure earlier V1.54 migrations have already run.
2. If you have **not already run V1.55 SQL**, open `supabase/upgrade-v1.55.txt`, copy all its text, and run it in **Supabase SQL Editor**. This is the previous **V1.55** migration. **V1.57 adds no database migration.**
3. Upload the **seven files inside `github-pages/`** into the **root of the `main` branch** of [`farikolninja97/vb-autosorter`](https://github.com/farikolninja97/vb-autosorter). Put `registration-match.js` at the repository root alongside `app.js` and `index.html`. Do not upload a new nested `github-pages/` directory and do not change `config.js`.
4. Check **GitHub Actions → pages build and deployment** and verify the latest deployment says **Success**. GitHub Pages was previously failing to start new builds, so a successful commit does not guarantee the site updated.
5. Open the website, confirm footer **V1.57**, and test the bulk matching flow in **Demo Mode**. Kiosk footer should also say **V1.57**.

## Verification and limits

Locally passed:
- Demo Mode V1.55 suite: start a session, publish, score, rotate, repair assigned roles, manual transfers, kiosk and mobile role labels.
- V1.56 suite: assigned-role-first layout and preferences visibility ON/OFF in preview and kiosk.
- V1.57 Playwright suite: automatic abbreviated name matching, ambiguous match review, unmatched-name grouping, manual profile correction, duplicate safeguards, new-profile creation and return, batch check-in, capacity protection, screenshot-import integration (OCR engine stubbed), and mobile layout.
- JavaScript syntax and matcher unit checks.

The SQL migration and actual screenshot OCR against external CDN resources were **not** tested on live Supabase/internet; screenshot OCR accuracy depends on the image. Local tests use simulated Supabase. Review all matches before committing check-ins.
