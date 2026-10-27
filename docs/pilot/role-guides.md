# GensanWorks — Quick Guides for Pilot Users (DRAFT)

Short, task-first guides for the three roles. Hand these out at onboarding.
Screens and labels match the pilot build; update after any UI change.

---

## Jobseekers

**Create your account**
1. Go to the site and choose **Sign up** → **Jobseeker**.
2. Sign up with email and password, or with Google.
3. Read the Privacy Notice and tick the box to continue. Without it, no
   profile is created.

**Complete your profile.** A complete profile helps PESO match you to vacancies.
1. Open **Profile** and follow the steps: personal details, education, skills,
   work history, languages, licenses and trainings.
2. Add skills you can actually show at work (for example "forklift operation",
   "food handling").

**Find and apply for jobs**
1. Open **Browse Jobs**, search by keyword or filter.
2. Open a job, write a short cover letter, and press **Send Application**.
3. You can send up to 10 applications per day.

**Track your applications.** **My Applications** shows the status of each one.
Notifications tell you about changes and referrals. A referral slip has a QR
code that the employer can check.

**Your data.** Under **Settings** you can **Download My Data** or **Request account deletion** for your
account. GensanWorks shows you jobs; it does not decide who is
hired.

---

## Employers

**Create your account**
1. Choose **Sign up** → **Employer** (email or Google).
2. Enter your establishment details and accept the Privacy Notice.
3. PESO reviews your account. You can post vacancies once you are approved.

**Post a vacancy**
1. Open **Job Postings** → **Create Job**.
2. Fill in the title, duties, required skills, salary range, slots and work setup.
3. PESO reviews each vacancy before it goes live.
4. Do not state age, gender, religion or similar preferences. Job requirements
   must be job-related (RA 10911 and PESO rules).

**Review applicants**
1. Open a vacancy → **Applications**.
2. Change an applicant's status and message them from the same page.

**PESO shortlists.** When PESO sends a ranked shortlist for your vacancy, it
appears under **View Matches**. The ranking is a recommendation based on
job-related factors (skills, experience, education, location). You decide
whom to interview and hire.

---

## PESO staff (admins)

**Sign in with two-step verification**
1. Go to **Admin sign in** and enter your email and password.
2. First time only: install an authenticator app (Google Authenticator,
   Microsoft Authenticator or similar). Scan the QR code on the screen, then
   enter the 6-digit code.
3. On later sign-ins, enter the current 6-digit code from the app.
4. **Lost your phone?** The system owner removes your old authenticator in
   Supabase (Authentication → Users → your user → MFA factors → delete). You
   then set it up again at the next sign-in. Never share codes or the QR code.

**Daily work**
- **Employers** (approvals): check the establishment details, then approve or reject.
- **Jobs**: review pending vacancies, then approve or reject with a reason.
- **Matching**: run matching for a vacancy, review the ranked list and the
  factors behind it, then send it to the employer. Scores are assistance.
  You decide who is referred.
- **Referrals**: issue a referral slip (QR code) and track its outcome.
- **Analytics**: LMI report (sector demand, top skills, placement rate) and CSV export.
- **Audit Logs**: every approval, referral and report send is recorded.

**Privacy**
- Export only what you need, and keep exports on PESO devices.
- Account deletion requests are processed by the system owner through the admin API (no screen yet). Stage 2
  (anonymization) runs only after the retention period is set.
