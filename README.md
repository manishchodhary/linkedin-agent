# LinkedIn Agent

A personal AI assistant for LinkedIn workflows, built with Google Agent Development Kit (ADK) for TypeScript and Gemini.

## Current capabilities

- Generate LinkedIn content grounded in the user's saved professional profile.
- Retrieve profile sections through a typed ADK tool.
- Update the local professional profile through validated tools and deterministic command routing.
- Add or remove saved skills and target roles, update the About summary and professional title, and change public profile links.
- Display the complete saved profile and verify changes after each write.
- Persist profile changes in a local JSON file across restarts.
- Keep local profile changes separate from LinkedIn account changes.
- Save, list, retrieve, and mark locally persisted content drafts as reviewed; drafts remain unpublished.\n- Save and retrieve company/internship verification reports with evidence links, risk flags, confidence, and a cautious verdict.

## Technology

- TypeScript / Node.js 20.19+
- Google ADK for TypeScript
- Gemini (currently configured as `gemini-3.5-flash-lite`)
- Zod 4 for input and profile validation
- JSON file storage for the local profile (PostgreSQL may be introduced when multi-user/API requirements justify it)

## Getting started

Install dependencies and create your environment file:

```bash
npm install
cp .env.example .env
```

Add your Google AI Studio API key:

```env
GOOGLE_GENAI_API_KEY=your_api_key
```

Start the agent:

```bash
npm run dev
```

Run TypeScript checks and the profile command tests:

```bash
npm run typecheck
npm test
```

## Profile storage

The repository contains a safe starter profile at `src/data/profile.default.json`.

On first use, the profile store creates `data/profile.json` in the project root. This file is intentionally gitignored because it contains personal profile data and may be edited at runtime.

The profile schema is defined in `src/data/profile.schema.ts`. Reads and updates are validated with Zod. Updates are merged with the current profile and written through a temporary file followed by an atomic rename.

### Agent examples

Retrieve saved information:

```text
What skills and target roles are saved in my profile?
```

Manage the local profile with explicit requests:

```text
Add Python to my local saved technical skills.
Remove React from my saved skills.
Update my local About section to Backend developer focused on reliable systems.
Change my saved professional title to Backend Engineer.
Add target role Platform Engineer to my saved roles.
Remove target role DevOps from my saved roles.
Update my saved GitHub link to https://github.com/example.
Show my complete saved profile.
```

The deterministic profile router handles supported, explicitly scoped local profile commands without relying on Gemini to choose a write tool. Requests that target a LinkedIn account are not intercepted. Changes are read back from storage before the agent reports success.

The agent should only save details the user explicitly provides or confirms. The update tool changes the local JSON profile only; it does not edit LinkedIn.

### Company and internship research

Research a company or internship before applying. Where browsing is available, verify official company information, opportunity details, independent reputation signals, whether fees are required, whether the business primarily sells training/courses, and whether internship tasks appear concrete. Include evidence links and separate verified facts from unknowns; absence of evidence is not proof of fraud.

Verdicts are risk-based: `worth_applying`, `needs_verification`, `high_risk_avoid`, or `insufficient_evidence`. Reports are saved locally to `data/company-research.json` (gitignored).

Examples:

```text
Research ABC company and its backend internship. Check whether it is a real internship or course-selling.
Save this company research report.
List my saved company research.
Show company research report <id>.
```

### Content drafts

Drafts are stored in `data/drafts.json` (gitignored). Ask the agent to draft a post, then explicitly request saving to persist it. Saved drafts have IDs and `draft` / `reviewed` statuses. Review status is not publishing permission.

Examples:

```text
Draft a post about learning backend reliability using my saved profile.
Save this draft as Backend Reliability Learning.
List my saved drafts.
Show draft <id>.
Mark draft <id> as reviewed.
```

## Architecture

```text
User
 |
Google ADK Root Agent
 |
 +-- Profile-aware command router
 |      |
 |   Profile Store (read / update / verify)
 |
 +-- Gemini conversational agent
 |      |
 +-- get_profile_context
 |      |
 |   Profile Store
 |      |
 |   data/profile.json
 |
 +-- update_profile
        |
     Zod validation
        |
     Atomic JSON persistence
```

We are deliberately starting with one agent and a small set of explicit tools. Specialized agents, a dashboard, a database, and external integrations will be added only when the use case requires them.

## Safety and development principles

1. Never invent professional experience, achievements, metrics, or skills.
2. Ask before saving ambiguous or inferred profile changes.
3. Local profile updates never imply LinkedIn account updates.
4. Require explicit approval before publishing, sending messages, connecting, or changing LinkedIn account data.
5. Use official LinkedIn APIs and permitted integrations; do not scrape or bypass platform restrictions.
6. Keep API keys in environment variables and personal runtime profile data out of Git.

## Roadmap

- [x] Initial TypeScript ADK agent
- [x] Gemini model connectivity
- [x] Typed profile retrieval tool
- [x] Zod-validated local profile schema
- [x] Persistent local profile storage
- [x] Profile update tool
- [x] Deterministic local profile management commands
- [x] Profile command parser tests
- [ ] Runtime verification of profile management commands
- [x] Content drafting and local review workflow
- [x] Company/internship research report storage and tools\n- [ ] Research and networking workflows
- [ ] Opportunity and application tracking
- [ ] LinkedIn OAuth and permitted API integration
- [ ] Dashboard, observability, and deployment

## LinkedIn integration note

LinkedIn API access is permission-based and does not expose every LinkedIn feature. Account integrations will be implemented only where the relevant API access and permissions are available.

## License

No license has been selected yet.
