# CollabJam Studio

CollabJam Studio is a Git-native collaborative music studio. Codex agents compose rhythm, harmony, and bass in isolated worktrees; humans review real pull requests before the merged production reaches playback.

## Phase 1

This foundation includes:

- React + Vite studio shell
- Express API with structured errors, security headers, CORS, and request logging
- SQLite persistence using Node.js 24's built-in `node:sqlite`
- Shared Zod schemas and TypeScript contracts
- Signed, HTTP-only admin session cookie
- Unit and API integration tests

Git worktrees, Codex execution, GitHub pull requests, and Tone.js are intentionally deferred to later phases.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The web app runs at `http://localhost:5173`; Vite proxies `/api` to the server at `http://localhost:3001`.

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
