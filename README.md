# CollabJam Studio

CollabJam Studio is a Git-native collaborative music studio. Codex agents compose rhythm, harmony, and bass in isolated worktrees; humans review real pull requests before the merged production reaches playback.

## Current capabilities

This foundation includes:

- React + Vite studio shell
- Express API with structured errors, security headers, CORS, and request logging
- SQLite persistence using Node.js 24's built-in `node:sqlite`
- Shared Zod schemas and TypeScript contracts
- Signed, HTTP-only admin session cookie
- Unit and API integration tests
- Git-ready song and music-part JSON files
- Song creation and public production APIs
- Tone.js playback with rhythm, harmony, and bass mute controls
- Isolated Git worktrees for rhythm, harmony, and bass branches
- Parallel agent job orchestration with persisted event history
- Mock agent runner for demos and tests, plus a Codex CLI runner option
- GitHub PR creation for each agent branch
- Human-controlled PR review and merge actions
- Live studio pipeline, commit timeline, review status, and final mix readiness

Railway deployment is intentionally deferred to a later phase.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The web app runs at `http://localhost:5173`; Vite proxies `/api` to the server at `http://localhost:3001`.

For real GitHub PRs, configure:

```bash
GITHUB_TOKEN=github_pat_or_token
GITHUB_OWNER=your-org-or-user
GITHUB_REPO=your-repo
GITHUB_REMOTE=origin
```

The token needs permission to create and merge pull requests. Branches are pushed to `GITHUB_REMOTE` before PR creation.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

For a production-style local run, build first and set `NODE_ENV=production`. The Express server serves `apps/web/dist` and provides SPA fallback routing.

## Architecture

```text
apps/web         React studio interface
apps/server      Express API, authentication, and SQLite
packages/shared  Runtime schemas and shared TypeScript types
```

## Roadmap

1. Foundation: monorepo, app shell, API, authentication, and persistence
2. Music domain: JSON music schema and Tone.js sequencing
3. Git engine: isolated worktrees and agent branches
4. Codex agents: parallel structured generation
5. GitHub workflow: real pull requests and human-controlled merges
6. Studio UI: live history, reviews, and final production
7. Railway: Docker deployment with persistent storage

Phases 1-6 are implemented. The default runner is `AGENT_RUNNER=mock` so local demos and tests do not consume Codex credits; set `AGENT_RUNNER=codex` to use the configured `CODEX_COMMAND`.
