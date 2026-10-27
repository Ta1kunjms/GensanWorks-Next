# Pilot data templates

Copy this folder, fill in the CSVs, then run:

```
npm run pilot:analyze -- path/to/your-folder
```

It writes `pilot-results.md` (tables ready for Chapter 4) and `pilot-results.json`.

- `survey.csv`: one row per respondent. Add one column per item, named construct + number (PU1…PU8, PEOU1…, BI1…, EV1_1… also works; the construct is the name without the trailing number). Answers 1–5; leave blank if unanswered. `group` = JS, EM or PS.
- `tasks.csv`: one row per respondent per task (task ids from `docs/pilot/pilot-protocol.md`, e.g. J4). `completed` = 1/0; `seconds` = time on task; `errors` = count.
- `baseline.csv`: Table 44 staff-reported ranges (low/high). Leave blank where there is no numeric baseline.
- `observations.csv`: one row per post-pilot observation (indicator name must match `baseline.csv`).

Use respondent codes only (e.g. JS-07). Do not enter names or emails. Keep filled-in files out of git (they are pilot data).
