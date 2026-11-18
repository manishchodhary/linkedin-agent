# LinkedIn Agent

A personal AI assistant for LinkedIn workflows, built with Google Agent Development Kit (ADK) for TypeScript and Gemini.

## Current capabilities

- Generate LinkedIn content grounded in the user's saved professional profile.
- Retrieve profile sections through a typed ADK tool.
- Update the local professional profile through a validated ADK tool.
- Persist profile changes in a local JSON file across restarts.
- Keep local profile changes separate from LinkedIn account changes.

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

Run TypeScript checks:

```bash
npm run typecheck
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

Update the local profile:

```text
Add Python to my skills.
```

The agent should only save details the user explicitly provides or confirms. The update tool changes the local JSON profile only; it does not edit LinkedIn.

## Architecture

```text
User
 |
Google ADK Root Agent
 |
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
- [ ] Profile tool tests and runtime verification
- [ ] Content drafting and review workflow
- [ ] Research and networking workflows
- [ ] Opportunity and application tracking
- [ ] LinkedIn OAuth and permitted API integration
- [ ] Dashboard, observability, and deployment

## LinkedIn integration note

LinkedIn API access is permission-based and does not expose every LinkedIn feature. Account integrations will be implemented only where the relevant API access and permissions are available.

## License

No license has been selected yet.
