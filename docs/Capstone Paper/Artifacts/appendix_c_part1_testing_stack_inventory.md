# Appendix C - Part 1: Testing Stack & Comprehensive Test-Suite Inventory

This artifact contains the factual, evidence-based technical inventory of the GensanWorks testing stack, package configuration, execution runtime requirements, and complete inventory of all test files in the repository for BSIT Capstone Appendix C.

---

## 1. Testing Stack Identification

- **Application Framework**: Next.js (`v15.0.0`, App Router architecture under `app/`).
  - *Evidence*: [`package.json:L79`](file:///d:/Personal_Projects/GensanWorks/package.json#L79) (`"next": "^15.0.0"`).
- **Primary Programming Language(s)**: TypeScript (`v5.3.0`) / JavaScript (Node.js engine `>=18.0.0`).
  - *Evidence*: [`package.json:L100`](file:///d:/Personal_Projects/GensanWorks/package.json#L100) (`"typescript": "^5.3.0"`), [`package.json:L125`](file:///d:/Personal_Projects/GensanWorks/package.json#L125) (`"node": ">=18.0.0"`).
- **Test Framework(s)**:
  - **Primary Unit & Integration Test Runner**: Node.js native test runner (`node:test`) with standard library assertion module (`node:assert` / `node:assert/strict`), executed via `tsx` runner.
    - *Evidence*: [`package.json:L18`](file:///d:/Personal_Projects/GensanWorks/package.json#L18) (`"test:unit": "tsx --test tests/**/*.test.ts"`), [`package.json:L123`](file:///d:/Personal_Projects/GensanWorks/package.json#L123) (`"tsx": "^4.20.6"`).
  - **End-to-End (E2E) UI Framework**: Playwright (`@playwright/test`).
    - *Evidence*: [`package.json:L33`](file:///d:/Personal_Projects/GensanWorks/package.json#L33) (`"test:e2e": "playwright test"`), [`package.json:L105`](file:///d:/Personal_Projects/GensanWorks/package.json#L105) (`"@playwright/test": "^1.40.0"`).
  - **Code Coverage Tool**: `c8`.
    - *Evidence*: [`package.json:L19`](file:///d:/Personal_Projects/GensanWorks/package.json#L19) (`"test:unit:coverage": "c8 ..."`), [`package.json:L113`](file:///d:/Personal_Projects/GensanWorks/package.json#L113) (`"c8": "^11.0.0"`).
- **Package Manager and Relevant Test Scripts**:
  - **Package Manager**: npm (`>=9.0.0`, `package-lock.json` present).
    - *Evidence*: [`package.json:L126`](file:///d:/Personal_Projects/GensanWorks/package.json#L126) (`"npm": ">=9.0.0"`).
  - **Test Scripts from `package.json`** ([`package.json:L17-L37, L44-L46`](file:///d:/Personal_Projects/GensanWorks/package.json#L17-L37)):
    - `"test": "npm run test:unit"`
    - `"test:unit": "tsx --test tests/**/*.test.ts"`
    - `"test:unit:coverage": "c8 --reporter=text --reporter=lcov --reporter=html tsx --test tests/**/*.test.ts"`
    - `"test:unit:coverage:check": "c8 --check-coverage --lines 80 --functions 80 --statements 80 --branches 70 tsx --test tests/**/*.test.ts"`
    - `"test:phase2:smoke": "tsx --test tests/phase-2-dashboards.test.ts"`
    - `"test:phase2:pages": "tsx --test tests/phase-2-dashboard-pages.test.ts"`
    - `"test:phase2:metrics:auth": "tsx --test tests/phase-2-dashboard-metrics-auth.test.ts"`
    - `"test:phase3:smoke": "tsx --test tests/phase-3-jobs.test.ts"`
    - `"test:phase3:apply:auth": "tsx --test tests/phase-3-apply-auth.test.ts"`
    - `"test:phase4:smoke": "tsx --test tests/phase-4-employer.test.ts"`
    - `"test:phase5:smoke": "tsx --test tests/phase-5-messaging.test.ts"`
    - `"test:phase6:smoke": "tsx --test tests/phase-6-admin-analytics.test.ts"`
    - `"test:phase8:smoke": "tsx --test tests/phase-8-security.test.ts"`
    - `"test:security": "npm run test:phase8:smoke"`
    - `"test:security:dynamic": "node scripts/dynamic-security-scan.js"`
    - `"test:load:smoke": "node scripts/load-smoke.js"`
    - `"test:e2e": "playwright test"`
    - `"test:e2e:phase7": "playwright test --workers=1 e2e/jobseeker-workflow.spec.ts e2e/employer-workflow.spec.ts e2e/admin-workflow.spec.ts"`
    - `"test:e2e:phase7:mutations": "playwright test --workers=1 e2e/signup-workflow.spec.ts e2e/admin-workflow.spec.ts"`
    - `"test:e2e:responsive": "playwright test --workers=1 e2e/responsive-workflow.spec.ts"`
    - `"verify:core": "npm run type-check && npm run test:unit && npm run build"`
    - `"verify:security": "npm run security:secrets:scan && npm run verify:delivery:channels && npm run test:security"`
    - `"verify:all": "npm run validate:env && npm run verify:core && npm run verify:security"`
- **Required Runtime**: Node.js `>=18.0.0` and npm `>=9.0.0`.
  - *Evidence*: [`package.json:L124-L127`](file:///d:/Personal_Projects/GensanWorks/package.json#L124-L127) (`"engines": { "node": ">=18.0.0", "npm": ">=9.0.0" }`).
- **Exact Test Execution Commands**:
  - **Matching-Related Test Suites (4 files)**:
    `npx tsx --test app/lib/matching/__tests__/bias.test.ts tests/matching-engine.test.ts tests/matching-narrative-rbac.test.ts tests/professor-fixes.test.ts`
  - **All Unit/Integration Test Suites (20 files)**:
    `npm run test:unit`
  - **All Playwright E2E Test Suites (5 files)**:
    `npm run test:e2e`

---

## 2. Complete Repository Test-Suite Inventory

A total of **25 automated test files** exist in the repository (20 Node.js unit/integration test files and 5 Playwright E2E spec files).

### Section 2.1 — Core Matching & AI Subsystem Test Files (4 Files / 31 Tests)

1. **[`app/lib/matching/__tests__/bias.test.ts`](file:///d:/Personal_Projects/GensanWorks/app/lib/matching/__tests__/bias.test.ts)**
   - **Framework**: `node:test` + `node:assert`
   - **Test Count**: **5** individual test cases
   - **Test Names**:
     1. `Task 6: Bias Verification > Test 1 — Gender Neutrality`
     2. `Task 6: Bias Verification > Test 2 — School Prestige Neutrality`
     3. `Task 6: Bias Verification > Test 3 — Employment Gap Neutrality`
     4. `Task 6: Bias Verification > Test 4 — QPE Enforcement Instruction`
     5. `Task 6: Bias Verification > Test 5 — Location Abstraction`
   - **Feature Validated**: Demographics stripping (`sex` field removal), school prestige filtering, employment gap duration calculation, QPE system prompt rule inclusion, barangay abstraction to logistics zone.
   - **Test Type**: Automated Unit / Bias & Privacy Test

2. **[`tests/matching-engine.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/matching-engine.test.ts)**
   - **Framework**: `node:test` + `node:assert`
   - **Test Count**: **3** individual test cases
   - **Test Names**:
     1. `Utility score correctly computes weighted dimensions and ignores f4/f5`
     2. `Deidentify strips demographic fields`
     3. `Title-relevance constraint caps score at 40 and assigns low confidence when title mismatch occurs for junior seeker`
   - **Feature Validated**: Multi-dimensional utility score weighted sum ($f_1, f_2, f_3, f_7, f_8$), demographic field blinding (`BLINDED_FIELDS`), title relevance constraint enforcement ($\le 40$ cap, low confidence, grade restriction).
   - **Test Type**: Automated Unit / Core Matching Engine Test

3. **[`tests/matching-narrative-rbac.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/matching-narrative-rbac.test.ts)**
   - **Framework**: `node:test` + `node:assert/strict`
   - **Test Count**: **6** individual test cases
   - **Test Names**:
     1. `RBAC Authorization for /api/matching/narrative > 1. An unauthenticated request returns HTTP 401`
     2. `RBAC Authorization for /api/matching/narrative > 3. An employer requesting a narrative for a job they do not own returns HTTP 403`
     3. `RBAC Authorization for /api/matching/narrative > 2. A jobseeker session requesting a narrative returns HTTP 403`
     4. `RBAC Authorization for /api/matching/narrative > 4. An employer requesting a narrative for a job they own is allowed`
     5. `RBAC Authorization for /api/matching/narrative > 5. An admin requesting a narrative for any valid job/jobseeker pair is allowed`
     6. `RBAC Authorization for /api/matching/narrative > 6. Ignores mock session when NODE_ENV is not 'test' and falls back to normal auth flow`
   - **Feature Validated**: Narrative API role-based authorization, authentication rejection, employer vacancy boundary protection, admin access override, mock auth environment safety gate.
   - **Test Type**: Automated API / Access-Control Security Test

4. **[`tests/professor-fixes.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/professor-fixes.test.ts)**
   - **Framework**: `node:test` + `node:assert`
   - **Test Count**: **17** individual test cases across 3 blocks
   - **Test Names**:
     - *computeVagueSkillAdjustment (6 subtests)*:
       1. `all vague skills → adjustment multiplier close to 0.40`
       2. `all specific skills → adjustment multiplier close to 1.05`
       3. `mixed 50/50 vague + specific → multiplier between 0.40 and 1.05`
       4. `empty skills array → multiplier 1.0, empty warnings, specificity_score 1.0`
       5. `single vague skill 'programming' → warning mentioning 'programming'`
       6. `single specific skill 'React' → empty warnings`
     - *formatScoreDerivation (7 subtests)*:
       7. `returns a non-empty string for valid inputs`
       8. `output contains each dimension name: Skills, Experience, Education`
       9. `output contains the word 'sigmoid' or 'calibration'`
       10. `output contains the final score as a number`
       11. `when vague_skill_warnings is non-empty, output mentions 'vague'`
       12. `zero scores produce a 'Weak' or 'Fair' grade in output`
       13. `perfect scores produce an 'Excellent' grade in output`
     - *auditFormCompletionBias (4 subtests)*:
       14. `when 6+ group mean > 1-2 group mean by more than 15 points → flag level is 'high'`
       15. `when gap is less than 15 points → flag level is 'none' or 'low'`
       16. `when only one group has data (no 1-2 skill seekers) → returns empty flags, no crash`
       17. `empty candidate array → returns empty flags, no crash`
   - **Feature Validated**: Skill vagueness penalty/bonus multiplier calculation (0.40–1.05), score explainer text formatting, form completion bias detection algorithm.
   - **Test Type**: Automated Unit / Matching Engine Adjustment & Safeguard Test

---

### Section 2.2 — Additional Unit & API Integration Test Files (16 Files / 95 Tests)

5. **[`tests/admin-jobseeker-password-reset.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/admin-jobseeker-password-reset.test.ts)** (1 test): `resetJobseekerPassword updates password for an existing jobseeker` (Unit / Admin Auth)
6. **[`tests/api-guardrails.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/api-guardrails.test.ts)** (5 tests): Rate limit windows, request ID propagation, client IP parsing, integer clamping. (Unit / Infrastructure)
7. **[`tests/auth-login-errors.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/auth-login-errors.test.ts)** (3 tests): Role-aware authentication error messaging and user feedback sanitization. (Unit / Auth Feedback)
8. **[`tests/dashboard-data.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/dashboard-data.test.ts)** (5 tests): Data fetching adapters for Admin, Employer, and Jobseeker portal dashboards. (Integration / Data Fetchers)
9. **[`tests/phase-2-dashboard-metrics-auth.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-2-dashboard-metrics-auth.test.ts)** (4 tests): Authenticated dashboard summary API metric endpoints across all 3 roles. (API Integration Smoke)
10. **[`tests/phase-2-dashboard-pages.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-2-dashboard-pages.test.ts)** (4 tests): Dashboard page authentication gates and login redirects. (Integration / Gate Checks)
11. **[`tests/phase-2-dashboards.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-2-dashboards.test.ts)** (5 tests): Unauthenticated request rejection (HTTP 401) across dashboard endpoints. (API Security)
12. **[`tests/phase-3-apply-auth.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-3-apply-auth.test.ts)** (2 tests): Non-jobseeker application submission rejection & duplicate application prevention guard. (API Business Logic)
13. **[`tests/phase-3-jobs.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-3-jobs.test.ts)** (5 tests): Public job vacancy listing, search filtering, full detail payload retrieval, 404 handling. (API Integration)
14. **[`tests/phase-3-legacy-parity-smoke.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-3-legacy-parity-smoke.test.ts)** (14 tests): Health check, public settings, legacy labor analytics charts, rate-limiting headers. (API Parity)
15. **[`tests/phase-4-employer.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-4-employer.test.ts)** (8 tests): Employer candidate application management, status updates, messaging, role boundaries. (API Access Control)
16. **[`tests/phase-5-messaging.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-5-messaging.test.ts)** (18 tests): Real-time messaging, typing indicators, SSE streams, socket tokens, notification read receipts. (API Realtime)
17. **[`tests/phase-6-admin-analytics.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-6-admin-analytics.test.ts)** (11 tests): Admin analytics timeline, CSV/XLS export generation, referral analytics, audit feed. (Admin API)
18. **[`tests/phase-8-security.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/phase-8-security.test.ts)** (9 tests): Security headers (CSP, HSTS), SQLi/XSS search input safety, origin forgery prevention, rate limits. (Security Hardening)
19. **[`tests/referrals-notifications-fixes.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/referrals-notifications-fixes.test.ts)** (5 tests): Role-based notification deep-link URL generation. (Unit / Routing)
20. **[`tests/security.test.ts`](file:///d:/Personal_Projects/GensanWorks/tests/security.test.ts)** (2 tests): Next.js global security header config & dev origin whitelist. (Config Audit)

---

### Section 2.3 — Playwright End-to-End Spec Files (5 Spec Files / 14 Tests)

21. **[`e2e/admin-workflow.spec.ts`](file:///d:/Personal_Projects/GensanWorks/e2e/admin-workflow.spec.ts)** (3 tests): Protected page redirects, admin analytics/access requests review, account deletion audit process. (E2E UI)
22. **[`e2e/employer-workflow.spec.ts`](file:///d:/Personal_Projects/GensanWorks/e2e/employer-workflow.spec.ts)** (4 tests): Protected page redirects, job creation/management, candidate status updates, cross-employer isolation. (E2E UI)
23. **[`e2e/jobseeker-workflow.spec.ts`](file:///d:/Personal_Projects/GensanWorks/e2e/jobseeker-workflow.spec.ts)** (2 tests): Public browsing, profile management, job application submission, deletion request cancellation. (E2E UI)
24. **[`e2e/responsive-workflow.spec.ts`](file:///d:/Personal_Projects/GensanWorks/e2e/responsive-workflow.spec.ts)** (2 tests): Mobile viewport (390x844) public rendering and jobseeker portal dashboard responsiveness. (E2E Mobile UI)
25. **[`e2e/signup-workflow.spec.ts`](file:///d:/Personal_Projects/GensanWorks/e2e/signup-workflow.spec.ts)** (3 tests): Jobseeker registration redirect, employer submission redirect, admin access request flow. (E2E Registration)

---

### Section 2.4 — Summary Totals

- **Total Unit / Integration Test Files**: 20 files (126 individual tests)
- **Total Playwright E2E Spec Files**: 5 files (14 individual tests)
- **Grand Total Repository Automated Test Inventory**: **140 individual test cases across 25 files**
