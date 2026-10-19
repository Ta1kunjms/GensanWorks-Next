# GensanWorks — Claude Instructions

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Project purpose

GensanWorks is a web-based employment platform and labor-market information system for General Santos City.

Primary users:
- Job seekers
- Employers
- PESO administrators

Project priorities:
- Secure role-based access
- Reliable job, application, employer, and labor-market workflows
- Accessible, responsive interface
- Fair, explainable, auditable AI-assisted job matching
- Capstone-quality testing, documentation, and traceability

## Working rules

- Default style: direct, concise, action-first.
- Read this file first.
- For codebase questions, follow the Graphify rules before broad source browsing when Graphify is available.
- Inspect relevant files before editing. Do not guess file paths, frameworks, scripts, schemas, APIs, or environment variables.
- Follow the existing repository architecture, patterns, component conventions, naming, types, validation, and error handling.
- Reuse existing utilities and components where appropriate.
- Make the smallest safe change that satisfies the request.
- Keep scope limited to the requested task. Do not perform unrelated cleanup, refactors, dependency upgrades, or configuration rewrites.
- Ask a question only if the answer cannot be verified from repository files or the user request.

## Security and privacy

- Never expose, print, commit, hardcode, or copy secrets, API keys, passwords, tokens, service-role keys, or `.env` contents.
- Do not commit `.env` files, credentials, generated folders, dependency folders, or secret-bearing configuration.
- Enforce authentication, role checks, organization membership, and record ownership in backend logic and database policies—not only in the UI.
- Validate all user-controlled input at system boundaries.
- Never expose sensitive applicant, resume, employer, or application data to unauthorized users.
- Keep privileged credentials and service-role access server-side only.
- Do not log unnecessary personally identifiable information.
- Treat uploads as untrusted: validate file type, file size, ownership, and access rules.

## Role rules

GensanWorks primary roles:
- Job seeker: profile, resume, skills, applications, saved jobs, recommendations.
- Employer: organization profile, job postings, applicant review, shortlisting, recruitment workflow.
- PESO administrator: verification, moderation, labor-market records, reports, dashboards, and oversight.

For protected features:
- Identify which role is permitted.
- Verify identity, ownership, and organization membership where applicable.
- Enforce the permission in server/database logic.
- Keep the UI aligned with the actual enforced permissions.
- Consider unauthorized-access and cross-account tests, not only successful paths.

## AI matching and fairness

AI-assisted features must support—not replace—authorized human hiring decisions.

For matching, ranking, scoring, or recommendations:
- Use job-relevant and explainable factors.
- Do not use protected characteristics or inappropriate proxies as decision criteria.
- Do not infer or rank applicants based on gender, age, ethnicity, religion, disability, marital status, pregnancy, political affiliation, or similar sensitive information.
- Keep a human in control of final hiring, rejection, and shortlisting decisions.
- Clearly communicate recommendations as assistance, not guarantees.
- Preserve privacy-safe auditability where the feature supports it: relevant rule/model version, time, authorized actor, input references, output, and human override.
- Identify fairness, discrimination, privacy, and explainability risks before implementing AI-related functionality.
- Never claim that the system is unbiased, objective, or guaranteed accurate.

## Database, Supabase, and deployment safety

- Do not alter database schema, migrations, Supabase Row Level Security policies, storage policies, authentication configuration, or production-like data without explicit user approval.
- Before proposing a migration, explain affected tables, data impact, rollback approach, and validation plan.
- Never run destructive SQL, bulk deletions, truncations, resets, or overwrite operations without explicit approval.
- Do not deploy, publish, push, release, or change CI/CD without explicit user approval.
- Do not add paid APIs, subscriptions, or external services without explicit user approval.

## Implementation workflow

For implementation tasks:

1. Inspect the relevant code, configuration, types, routes, API handlers, data flow, and tests.
2. State a short plan with affected files and relevant security, role, data, AI, or migration impact.
3. Implement only the smallest scoped change.
4. Run the most relevant existing checks: lint, type-check, tests, build, or focused local verification.
5. If code changed and Graphify is available, run:

   ```bash
   graphify update .
   ```

6. Report exactly what changed, what validation ran, what was not run, and any blockers.

For significant cross-cutting work involving architecture, authentication, authorization, AI, database policies, or privacy:
- Use the relevant specialists in `.claude`.
- Use the council synthesizer to consolidate findings before implementation.
- Do not make high-impact changes until required approval is obtained.

## Git rules

- Check `git status` before changing files when relevant.
- Never overwrite, delete, revert, stage, or commit unrelated user changes.
- Do not commit automatically.
- Before a requested commit, show changed files, validation results, and a proposed commit message.
- Commit only after explicit approval.
- Never force-push unless explicitly instructed after explaining the impact.
- Never add a Co-Authored-By trailer attributing Claude, Anthropic, or any AI tool to any commit. All commits are attributed to the project owner only. This applies to every future commit in this repo, including amends.

## Approval required

Ask for explicit approval before:
- Database migrations or modifying production-like data
- Supabase RLS, storage, auth, or role-policy changes
- Authentication or authorization changes
- Breaking API, database, route, or interface changes
- Deleting files, data, branches, backups, or configurations
- Installing dependencies or making dependency upgrades
- Deploying, publishing, pushing, releasing, or changing CI/CD
- External integrations, paid services, or outbound communications
- Destructive commands or commands that may overwrite user work

## Required response format

For implementation work, respond with:

Changed files:
- `<path>` — `<short description>`

Actions:
- `<what was inspected, changed, or decided>`

Validation:
- `<command or verification>` — `<result>`
- If not run: `<check>` — `Not run: <reason>`

Security / data / role impact:
- `<impact or None>`

Blockers:
- `<blocker or None>`

Next action:
- `<required action or None>`

For analysis-only or no-change work, respond with:

No changes made

Findings:
- `<verified finding>`

Risks:
- `<risk or None>`

Recommended next action:
- `<specific next action or None>`


## Project journal (PROJECT_STATE.md)

- Always read `PROJECT_STATE.md` at session start.
- Check **Next Steps** in `PROJECT_STATE.md` before doing any work.
- After completing any task or making any decision, immediately append to `PROJECT_STATE.md` (**Task History** + **Decision Log**) and rewrite **Next Steps**.
- Never delete history in `PROJECT_STATE.md`; only append. (Only **Current State Snapshot** and **Next Steps** may be rewritten.)
- Use `YYYY-MM-DD` dates and name the agent in Task History entries. Mark anything not verifiable from the repo as `[UNKNOWN]`.
