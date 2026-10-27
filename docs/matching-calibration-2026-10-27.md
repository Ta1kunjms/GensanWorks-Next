# Matching score calibration — findings (2026-10-27)

Decision needed from the owner: calibrate, or report as a limitation.
Data: the only scored vacancy in production so far (1 job, 114 synthetic demo
candidates, `job_match_scores`, read-only aggregate query). One job is not
enough to generalize; treat the numbers as an illustration.

## What the scores look like

| Quartile (by score) | n | Min | Mean | f1 skills raw | f2 experience raw | f3 education raw | f7 edu relevance raw |
|---|---|---|---|---|---|---|---|
| Top 25% | 29 | 68.0 | 73.1 | 0.55 | 0.59 | 1.00 | 0.34 |
| 2nd | 29 | 62.8 | 65.7 | 0.49 | 0.52 | 1.00 | 0.31 |
| 3rd | 28 | 58.6 | 60.4 | 0.48 | 0.50 | 1.00 | 0.14 |
| Bottom 25% | 28 | 50.8 | 55.2 | 0.48 | 0.44 | 1.00 | 0.10 |

Overall range 50.8–97.8 (the two fish processors scored 97.8 / 97.6).

## Why unrelated candidates still score 50–60

`calibrateScore()` maps the weighted sum through a sigmoid centred at 0.40:
`final = 100 / (1 + e^(-10 (raw - 0.40)))`, so a raw sum of 0.40 shows as **50**.
The raw sum of an unrelated candidate is already about 0.40 because:

1. **Education (f3, weight 0.05) is 1.00 for every candidate**: the vacancy's
   required level is at or below everyone's level, so it adds the same 5 points
   of raw score to all.
2. **Description relevance (f8, weight 0.20) is about the 0.3 fallback for
   everyone**: back-calculated from the stored scores (raw ≈ 0.42 bottom
   quartile, ≈ 0.50 top; the stored f1+f2+f3+f7 parts sum to ≈ 0.36 and ≈ 0.45),
   f8 contributes ≈ 0.05–0.06, i.e. the `raw: 0.3` default used when the
   description or profile vectors are missing. Another constant ~6 points.
3. **Skills (f1) give ≈ 0.48 partial credit even in the bottom quartile**: the
   fuzzy matching (Jaro-Winkler / token-set, 0.95 substring boost) rewards
   unrelated skills.

Ranking order is still sensible (related occupations rank highest); the issue
is the absolute number shown, which reads as "average fit" for poor matches.

## Changes made today (no score change)

- `dimension_scores` now also stores **f8** and the **pre-calibration
  `raw_utility_score`**, so every stored score can be explained from its parts
  (`persistence-engine.ts`, `agent.ts`, `tests/matching-audit-fields.test.ts`).
  Re-run matching on a job to fill these for existing rows.

## Options

| Option | Change | Effect | Cost |
|---|---|---|---|
| A. Limitation | None; state in Ch. 3/5 that scores are relative rankings within a vacancy, not absolute probabilities | Nothing to re-validate | Wording only |
| B. Re-centre | Sigmoid centre 0.40 → ~0.50 | Poor matches show ~30–40 instead of ~50–60; order unchanged | Re-run the 35-test matching suite and Appendix C evidence; new `MATCHING_SCORE_VERSION` |
| C. Remove constants | f8 fallback 0.3 → 0 (or drop f8 when vectors are missing and renormalize); f3 only counts when the vacancy states a requirement | More honest separation | Same re-validation as B; changes the method described in Ch. 3 |

Recommendation: **A for the pilot** (ranking order is what PESO staff act on,
and changing the scoring now invalidates the existing validation evidence),
with B/C listed as future work. Any change to scoring must bump
`MATCHING_SCORE_VERSION` and re-run the matching validation suite.
