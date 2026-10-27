# GensanWorks Controlled Pilot — Protocol (DRAFT)

Status: draft for adviser and PESO approval. Not yet approved. Aligns with the
manuscript (`Files/Revised 5.docx`, SO2 and SO7, §3.7.1, Table 44) and the open
edits in `Files/Manuscript Revision 3.md` (Edits 1-09, 3-51, 3-53, §3.10.7). If
the manuscript changes, the manuscript wins and this file is updated.

## 1. Purpose

1. Task-based usability: can each role complete its core tasks (completion
   rate, time on task, errors)?
2. Acceptance (SO7): TAM survey; PU and PEOU means of at least 4.00 / 5.00.
3. Workflow comparison (SO2): post-pilot observation of the Table 44
   vacancy-related indicators against the staff-reported baseline,
   reported descriptively.

The pilot does not test whether matching scores are "correct". Ranked lists
are decision support; PESO staff and employers make every shortlisting,
referral and hiring decision.

## 2. Participants

Purposive sample, target n = 50:

| Group | Target | Notes |
|---|---|---|
| Jobseekers | ~30 | Adults registering with PESO General Santos City |
| Employers | ~15 | Approved establishments with an open vacancy |
| PESO staff | up to 5 | Total enumeration; admin accounts with two-step verification |

Participation is voluntary. Each participant reads the information sheet and
the in-app Privacy Notice and gives consent before starting. Withdrawal is
possible at any time without effect on PESO services.

## 3. Preconditions (all must be true before day 1)

- [ ] Version frozen: release tagged in GitHub; only critical fixes deployed,
      each logged with date (manuscript §3.6 version-freeze text).
- [ ] Admin two-step verification (TOTP) enrolled for every PESO staff account.
- [ ] Final Privacy Notice text approved; `PRIVACY_NOTICE_VERSION` updated.
- [ ] Data decision recorded: synthetic demo data removed
      (`docs/seed/demo-mindanao-cleanup.sql`) or kept and labelled.
      Pilot constraint #2: real personal data only after the privacy/security
      prerequisites are met.
- [ ] Account-deletion retention period set (`ACCOUNT_ANONYMIZATION_RETENTION_DAYS`).
- [ ] Groq narrative model reachable, or narratives accepted as score-only.
- [ ] Unit and e2e evidence saved in `docs/testing-evidence/` for the frozen version.
- [ ] TAM instrument final (manuscript Tables 31–33) — see §6.

## 4. Tasks per role

Observers record per task: completed (yes/no), time on task (start = task
read aloud, end = success screen or give-up), errors (wrong path, failed
submit, needed help). No screen recording of personal data.

### Jobseeker
| # | Task | Success screen |
|---|---|---|
| J1 | Create an account (email or Google) and accept the Privacy Notice | Jobseeker dashboard |
| J2 | Complete the profile wizard (personal, education, skills, work history) | Profile completeness shown |
| J3 | Find a job by keyword and open its details | Job detail page |
| J4 | Apply to that job with a short cover letter | "Application Sent" dialog |
| J5 | Check the application's status | My Applications list |
| J6 | Open a notification and a referral slip (if issued) | Notification / slip page |

### Employer
| # | Task | Success screen |
|---|---|---|
| E1 | Create an employer account and submit establishment details | Pending-approval notice |
| E2 | Post a vacancy (title, skills, salary, slots) | Job listed as pending review |
| E3 | Open the applicant list for a vacancy | Applications page |
| E4 | Move one applicant to the next status and send a message | Status updated |
| E5 | View the PESO ranked shortlist for a vacancy (after PESO sends it) | Matching page |
| E6 | Record feedback on a referral | Feedback saved |

### PESO staff (admin)
| # | Task | Success screen | Table 44 indicator |
|---|---|---|---|
| A1 | Sign in with password and authenticator code | Admin dashboard | — |
| A2 | Approve a pending employer | Employer approved | — |
| A3 | Review and approve a vacancy | Job active | Vacancy posting time |
| A4 | Run matching for a vacancy and review the ranked list | Ranked list | Job matching time per vacancy |
| A5 | Issue a referral slip with QR code | Slip number shown | Referral slip issuance time |
| A6 | Open the LMI report (sector demand, top skills, placement rate) and export CSV | CSV downloaded | — |

## 5. Procedure

1. Briefing (5 min): purpose, voluntary participation, consent, no right/wrong answers.
2. Tasks (20–30 min): think-aloud; the observer helps only after 3 minutes
   stuck or on request (counted as an error).
3. TAM survey (10 min): paper or form; no names or email addresses on the
   survey (respondent code only, e.g. JS-07, EM-03, PS-02).
4. Short debrief: open-ended likes, problems, suggestions.

## 6. Instruments

- TAM questionnaire: manuscript Tables 31–33 (5-point Likert, Table 29
  interpretation). Before use, resolve Manuscript Revision 3 findings:
  jobseeker items must not ask about suitability scores or AI matching
  (hidden from jobseekers by RBAC); item counts must match the text; no
  names or emails collected.
- Optional: System Usability Scale (10 items) as a benchmark (Revision 3 item 9).
- Observation sheet: one row per task with the three measures in §4.

## 7. Analysis (manuscript §3.10.7)

- Frequency and percentage for respondent profile by group.
- Weighted mean and standard deviation per item and construct; acceptance =
  PU and PEOU means ≥ 4.00.
- Cronbach's alpha on the pooled sample (Table 30 note).
- Task completion rate, mean time on task, mean errors per task.
- Table 44: difference and percentage change between the baseline estimate
  (midpoint of staff-reported range) and the post-pilot median; indicators
  without a numeric baseline reported as post-pilot values only.
- Thematic analysis of open-ended feedback. No inferential tests.

## 8. Data handling

- Survey and observation sheets carry respondent codes only; the code key is
  kept by the proponents offline and destroyed after Chapter 4 is approved.
- No exports containing personal data leave PESO devices.
- Incidents (wrong data shown, access problem) are logged with date and
  reported to PESO the same day; see `docs/incident-response-template.md`.

## 9. Open decisions (owner / adviser / PESO)

- Pilot dates and venue.
- Real data vs synthetic data during the pilot (pilot constraint #2).
- Final TAM item lists (Tables 31–33) and whether SUS is added.
