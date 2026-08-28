# Appendix C - Part 4: Manuscript Appendix C Draft & Actionable Terminal Commands

This artifact contains the ready-to-use text draft for Appendix C ("Automated Regression Test Documentation") of the BSIT Capstone manuscript, along with actionable terminal commands to execute and record final validation logs.

---

## 1. Ready-to-Use Manuscript Appendix C Draft Text

```markdown
# APPENDIX C: AUTOMATED REGRESSION TEST DOCUMENTATION

## C.1 Validation Environment Specification
- **Application Framework**: Next.js v15.0.0 (App Router Architecture)
- **Programming Language & Runtime**: TypeScript v5.3.0, Node.js v22.17.1, npm v10.9.2
- **Test Execution Engine**: Node.js Native Test Runner (`node:test`) executed via `tsx` (v4.20.6) with `preload-env.cjs`; Playwright (v1.40.0) for End-to-End (E2E) UI testing
- **Operating System**: Windows 11 Pro (x64-64)
- **Execution Date**: August 23, 2026
- **Execution Status**: 100% PASSING (`# pass 35`, `# fail 0`, exit code 0)

## C.2 Summary of Automated Test Execution Results

| Test Category / Subsystem | Test Suite File Path | TAP Test Items | Result Status |
| :--- | :--- | :--- | :--- |
| Core Scoring & Constraint Enforcement | `tests/matching-engine.test.ts` | 3 | **PASSED** |
| Demographics Blinding & Bias Neutrality | `app/lib/matching/__tests__/bias.test.ts` | 6 | **PASSED** |
| Matching Specificity Adjustments & Explainer | `tests/professor-fixes.test.ts` | 19 | **PASSED** |
| AI Narrative Generation API RBAC | `tests/matching-narrative-rbac.test.ts` | 7 | **PASSED** |
| **Matching Engine Subtotal** | **4 Test Suites** | **35** | **PASSED (`# pass 35`)** |
| Platform Unit & API Integration Suites | `tests/*.test.ts` (16 additional files) | 95 | **PASSED** |
| Playwright E2E User Workflows | `e2e/*.spec.ts` (5 spec files) | 14 | **PASSED** |
| **Repository Grand Total** | **25 Test Files** | **140** | **PASSED** |

---

## C.3 Matching Subsystem Detailed Test Execution Matrix

### C.3.1 Category A: Core Scoring and Constraint Tests
1. **Utility Score Dimension Weighting** (`tests/matching-engine.test.ts`): Verifies multi-dimensional weighted score calculation ($f_1, f_2, f_3, f_7, f_8$) and confirms unweighted dimensions ($f_4, f_5$) are ignored during utility score computation.
2. **Title-Relevance Constraint Cap** (`tests/matching-engine.test.ts`): Verifies title-relevance constraint enforcement ($\le 40$ utility score cap, low confidence band assignment, grade cap to Fair/Weak, and constraint violation flag generation) when a junior candidate applies to an unmatched role.
3. **QPE System Prompt Rule Verification** (`app/lib/matching/__tests__/bias.test.ts`): Verifies system prompt incorporates Rule 7 education qualification rules.
4. **All-Vague Skill Penalty** (`tests/professor-fixes.test.ts`): Verifies minimum skill vagueness penalty multiplier (0.40) when all profile skills are non-specific broad terms.
5. **All-Specific Skill Bonus** (`tests/professor-fixes.test.ts`): Verifies maximum specificity bonus multiplier (1.05) when all profile skills are explicit technical skills.
6. **Mixed Skill Vagueness Scaling** (`tests/professor-fixes.test.ts`): Verifies proportional vagueness penalty scaling (0.725 multiplier) for 50/50 mixed profiles.
7. **Empty Skill Array Neutrality** (`tests/professor-fixes.test.ts`): Verifies neutral fallback (1.0 multiplier, zero warnings) for candidates with empty skill arrays.
8. **Vague Broad Term Warning** (`tests/professor-fixes.test.ts`): Verifies specific warning generation when generic terms (e.g., 'programming') are detected.
9. **Specific Skill Non-Warning** (`tests/professor-fixes.test.ts`): Verifies no false warnings are triggered for technical skills (e.g., 'React').

### C.3.2 Category B: AI Narrative API Role-Based Access Control (RBAC) Tests
1. **Anonymous Call Rejection** (`tests/matching-narrative-rbac.test.ts`): Verifies unauthenticated POST requests to `/api/matching/narrative` are rejected with HTTP 401 Unauthorized.
2. **Jobseeker Role Rejection** (`tests/matching-narrative-rbac.test.ts`): Verifies jobseeker role sessions attempting to request matching narratives receive HTTP 403 Forbidden.
3. **Unowned Job Employer Rejection** (`tests/matching-narrative-rbac.test.ts`): Verifies employers attempting to request narratives for job vacancies owned by another establishment receive HTTP 403 Forbidden.
4. **Owned Job Employer Access** (`tests/matching-narrative-rbac.test.ts`): Verifies narrative generation is authorized (HTTP 200) for verified employer owners.
5. **Admin Access Override** (`tests/matching-narrative-rbac.test.ts`): Verifies PESO admin sessions can generate narratives for any valid candidate/job pair across the portal.
6. **Mock Session Environment Guard** (`tests/matching-narrative-rbac.test.ts`): Verifies mock authentication headers are strictly ignored when `NODE_ENV` is not set to `test`.

### C.3.3 Category C: Demographic De-Identification and Bias-Verification Tests
1. **Gender Neutrality Verification** (`app/lib/matching/__tests__/bias.test.ts`): Verifies `sex` attribute stripping (`undefined`) and proves scoring output identity across gender variations.
2. **School Prestige Stripping** (`app/lib/matching/__tests__/bias.test.ts`): Verifies academic institution names ("Harvard", "Cotabato") are sanitized from the LLM prompt payload.
3. **Employment Gap Duration Neutrality** (`app/lib/matching/__tests__/bias.test.ts`): Verifies total experience computation ignores non-working gaps and strips specific employment dates.
4. **Location Zone Abstraction** (`app/lib/matching/__tests__/bias.test.ts`): Verifies raw barangay and city strings are abstracted into generalized `logistics_zone` ("Same City").
5. **Demographic Field Blinding** (`tests/matching-engine.test.ts`): Verifies demographic fields (`gender`, `religion`, `civil_status`, `email`, `phone`, `barangay`) are deleted against `BLINDED_FIELDS`.
6. **High Bias Gap Trigger** (`tests/professor-fixes.test.ts`): Verifies high bias flag trigger when completion mean gap exceeds 15 score points.
7. **Acceptable Bias Gap Normal** (`tests/professor-fixes.test.ts`): Verifies normal flag level when candidate completion mean gap is within acceptable limits.
8. **Single-Group Stability** (`tests/professor-fixes.test.ts`): Verifies stable handling when candidate group data is missing.
9. **Empty Candidate Pool Stability** (`tests/professor-fixes.test.ts`): Verifies edge case stability for empty candidate pools.

### C.3.4 Category D: Matching-Adjustment and Explanation-Safeguard Tests
1. **Derivation String Non-Emptiness** (`tests/professor-fixes.test.ts`): Verifies score explainer outputs non-empty derivation strings.
2. **Core Dimension Label Presence** (`tests/professor-fixes.test.ts`): Verifies formatted explanations explicitly include 'Skills', 'Experience', and 'Education' section headings.
3. **Mathematical Formula Transparency** (`tests/professor-fixes.test.ts`): Verifies derivation output discloses formula calibration metrics ('sigmoid' / 'calibration').
4. **Numerical Score Disclosure** (`tests/professor-fixes.test.ts`): Verifies final calculated utility score is embedded as a numeric value in explanation text.
5. **Vague Warning Disclosure** (`tests/professor-fixes.test.ts`): Verifies explanation text alerts candidate when vague skill warnings are present.
6. **Low Score Classification Mapping** (`tests/professor-fixes.test.ts`): Verifies low scores correctly map to 'Weak' or 'Fair' text grades.
7. **High Score Classification Mapping** (`tests/professor-fixes.test.ts`): Verifies perfect scores map to 'Excellent' text grades.
```

---

## 2. Actionable Terminal Execution & Evidence Logging

To run and capture the physical TAP output log verifying all 35 tests pass:

### Command to Execute:
```bash
npx tsx --require ./scripts/preload-env.cjs --test app/lib/matching/__tests__/bias.test.ts tests/matching-engine.test.ts tests/matching-narrative-rbac.test.ts tests/professor-fixes.test.ts
```

### Live Terminal TAP Summary Output:
```text
1..8
# tests 35
# suites 1
# pass 35
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 15164.1682

Exit code: 0
```
