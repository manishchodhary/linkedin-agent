# LinkedIn Agent

A personal AI assistant for managing LinkedIn workflows, built with Google Agent Development Kit (ADK) for TypeScript and Gemini.

## Project goals

- Draft and refine LinkedIn posts in the user's voice.
- Help research relevant people, companies, and opportunities.
- Prepare personalized connection notes and message replies.
- Track follow-ups and job applications.
- Review profile content and suggest improvements.
- Keep the user in control: actions that publish, send, or change account data require explicit approval.

## Architecture (planned)

```text
React Dashboard
      |
Node.js API
      |
Google ADK Root Agent
      |
  +---+-----------+-------------+
  |               |             |
Content Agent  Research Agent  Opportunity Agent
  |               |             |
  +----------- Agent Tools -----+
                  |
        Approval + Audit Layer
                  |
       PostgreSQL / Integrations
```

The architecture will evolve as features are implemented. We will start with one working agent and add specialized agents only when there is a clear need.

## Technology

- TypeScript / Node.js
- Google ADK for TypeScript
- Gemini
- PostgreSQL (planned)
- React dashboard (planned)

## Prerequisites

- Node.js 20.19+
- npm
- Google AI Studio API key

## Getting started

```bash
npm install
cp .env.example .env
```

Add your Gemini API key to `.env`:

```env
GOOGLE_GENAI_API_KEY=your_api_key
```

Run the agent:

```bash
npm run dev
```

Run the ADK development UI:

```bash
npm run adk:web
```

## Development principles

1. Build and test one capability at a time.
2. Keep model reasoning separate from side-effecting tools.
3. Require explicit user approval before publishing, sending, or modifying LinkedIn data.
4. Use official LinkedIn APIs and permitted integrations; do not rely on scraping or bypassing platform restrictions.
5. Store secrets only in environment variables.
6. Record tool executions and consequential actions for auditability.

## Current status

**Stage 0 — Repository setup.** The initial TypeScript ADK agent scaffold is being established.

## Roadmap

- [ ] Stage 1: First ADK agent and local development workflow
- [ ] Stage 2: Typed custom tools and structured outputs
- [ ] Stage 3: User profile context and persistent memory
- [ ] Stage 4: LinkedIn OAuth and permitted API integration
- [ ] Stage 5: Content drafting, review, and publishing workflow
- [ ] Stage 6: Research, networking assistance, and follow-up tracking
- [ ] Stage 7: Opportunity research and application tracking
- [ ] Stage 8: Dashboard, observability, and deployment

## Important

LinkedIn API access is permission-based and does not expose every LinkedIn feature. Integrations will be implemented only where the relevant API access and permissions are available.

## License

No license has been selected yet.
