# CollabJam Studio

**A Git-native collaborative music studio where AI agents compose song parts in isolated branches, humans review pull requests, and the merged production plays in the browser.**

CollabJam Studio brings software collaboration patterns to AI-assisted music creation. A user starts a song idea, three agents work on rhythm, harmony, and bass in separate Git worktrees, each part is committed to its own branch, and a human producer approves the final merge through GitHub pull requests.

## Why It Exists

Most AI music tools produce a final result as a black box. CollabJam Studio makes the creative process inspectable:

- every AI-generated part is a structured JSON file
- every agent works in an isolated Git worktree
- every contribution has commits, branches, and history
- every integration step goes through human review
- the final merged song can be played directly with Tone.js

The result is a music studio that feels closer to a collaborative engineering workflow: branch, compose, review, merge, play.

## Demo Flow

1. Create a song, for example `Neon Velvet Getaway`.
2. Run three agents: `rhythm`, `harmony`, and `bass`.
3. Each agent writes its part into a separate Git worktree.
4. Each agent commits to a role branch.
5. The app creates GitHub pull requests into `main`.
6. A human marks PRs for review and approves merges.
7. The final merged production plays in the browser.

## Features

- React + Vite studio dashboard
- Express + TypeScript API
- SQLite persistence with Node.js `node:sqlite`
- Zod schemas shared across frontend and backend
- Password-based admin login with signed HTTP-only cookies
- Git worktree orchestration for isolated agent workspaces
- Mock agent mode for predictable demos without AI credits
- Codex CLI mode for real agent execution
- GitHub PR creation and merge workflow
- Live job events and commit timeline
- Tone.js browser playback from structured music JSON
- Docker deployment support for Railway and Render
- Persistent `/data` layout for hosted SQLite, runtime Git repo, songs, and worktrees

## Tech Stack

```text
apps/web          React, Vite, TypeScript, Tone.js
apps/server       Express, TypeScript, SQLite, Git orchestration
packages/shared   Zod schemas and shared TypeScript types
songs/            Seed song JSON and part JSON
```

## Repository Layout

```text
.
├── apps/
│   ├── server/          Express API and orchestration engine
│   └── web/             React studio UI and Tone.js playback
├── packages/
│   └── shared/          Shared schemas and types
├── songs/               Seed local song data
├── scripts/             Deployment entrypoint scripts
├── Dockerfile           Full-stack production image
├── railway.json         Railway deployment config
├── render.yaml          Render deployment config
└── .env.example         Local and hosted environment template
```

## Local Setup

Requires Node.js 24 or newer.

```bash
cp .env.example .env
npm install
npm run dev
```

The app runs locally as two processes:

```text
Web:    http://localhost:5173
API:    http://localhost:3001
```

Vite proxies `/api` requests to the server.

## Common Commands

```bash
npm run dev          # Start web and API in development
npm run format       # Format the workspace
npm run lint         # Run ESLint
npm run typecheck    # Type-check all workspaces
npm test             # Run unit and API tests
npm run build        # Build shared, web, and server packages
npm start            # Start the production server after build
```

## Environment Variables

Start with `.env.example`.

### Required Locally

```bash
NODE_ENV=development
PORT=3001
WEB_ORIGIN=http://localhost:5173
DATABASE_PATH=./data/collabjam.db
GIT_REPO_PATH=.
SONGS_PATH=./songs
WORKTREES_PATH=./worktrees
ADMIN_PASSWORD=change-me
SESSION_SECRET=replace-with-at-least-32-characters
AGENT_RUNNER=mock
```

### GitHub PR Integration

Use a separate demo music repository for `GITHUB_REPO`. Do not point this at the CollabJam source repository unless you intentionally want agent branches there.

```bash
GITHUB_TOKEN=github_pat_or_token
GITHUB_OWNER=your-org-or-user
GITHUB_REPO=your-demo-music-repo
GITHUB_REMOTE=origin
GIT_AUTHOR_NAME=CollabJam Studio
GIT_AUTHOR_EMAIL=collabjam@example.local
```

The GitHub token needs permission to:

- push branches
- create pull requests
- merge pull requests

For a classic personal access token, `repo` scope is enough for private repos. For fine-grained tokens, grant access to the demo repository with contents and pull request permissions.

### Agent Runtime

Mock mode is the safest mode for demos:

```bash
AGENT_RUNNER=mock
```

Codex mode runs real Codex CLI agents:

```bash
AGENT_RUNNER=codex
CODEX_COMMAND=codex
CODEX_TIMEOUT_MS=300000
OPENAI_API_KEY=your-openai-api-key
```

On a local machine, Codex CLI may already be authenticated. In a hosted container, you need deployment-friendly Codex/OpenAI authentication, usually through `OPENAI_API_KEY`.

## Git-Native Workflow

For each song, CollabJam creates one branch per musical role:

```text
song-slug/rhythm
song-slug/harmony
song-slug/bass
```

Each branch is checked out in an isolated worktree:

```text
worktrees/song-slug/rhythm/
worktrees/song-slug/harmony/
worktrees/song-slug/bass/
```

Agents write JSON files like:

```text
songs/song-slug/parts/rhythm.json
songs/song-slug/parts/harmony.json
songs/song-slug/parts/bass.json
```

Each part is committed with a message such as:

```text
Rhythm agent: generate initial pattern v1
```

When PRs are created, the app pushes the role branches to GitHub and opens pull requests into `main`.

## Music JSON Schema

Each part is a structured JSON file:

```json
{
  "version": 1,
  "role": "bass",
  "instrument": "mono-synth",
  "bars": 4,
  "events": [
    {
      "time": "0:0:0",
      "note": "A2",
      "duration": "4n",
      "velocity": 0.9
    }
  ]
}
```

Supported roles:

```text
rhythm
harmony
bass
```

Playback uses Tone.js and schedules the final merged JSON events directly from the browser.

## API Overview

```text
GET    /api/health
GET    /api/session
POST   /api/session/login
POST   /api/session/logout
GET    /api/songs
GET    /api/songs/:slug
GET    /api/songs/:slug/history
POST   /api/songs
POST   /api/songs/:slug/generate
GET    /api/jobs/:jobId
GET    /api/jobs/:jobId/events
GET    /api/songs/:slug/pull-requests
POST   /api/songs/:slug/pull-requests
POST   /api/pull-requests/:number/review
POST   /api/pull-requests/:number/merge
GET    /api/admin/deployment
```

Mutation endpoints require admin login.

`GET /api/admin/deployment` is a protected diagnostics endpoint that reports deployment paths, GitHub configuration presence, Git remote state, and branch diagnostics without exposing secrets.

## Deployment

The production app runs as a single Docker service. The container builds the React app, compiles the Express server, installs `git`, and starts the API server. The server also serves the built React app.

Persistent runtime data lives under `/data`:

```text
/data/collabjam.db      SQLite database
/data/repo              Runtime Git repository
/data/repo/songs        Song JSON files
/data/worktrees         Agent Git worktrees
```

The Dockerfile does not declare a Docker `VOLUME`; configure `/data` using the host platform's volume or disk settings.

### Railway

1. Deploy from the GitHub source repository.
2. Add a Railway volume mounted at `/data`.
3. Set environment variables:

```bash
NODE_ENV=production
PORT=3001
DATABASE_PATH=/data/collabjam.db
GIT_REPO_PATH=/data/repo
SONGS_PATH=/data/repo/songs
WORKTREES_PATH=/data/worktrees
WEB_ORIGIN=https://your-railway-domain.up.railway.app
ADMIN_PASSWORD=choose-a-long-password
SESSION_SECRET=generate-at-least-32-random-characters
AGENT_RUNNER=mock
```

Railway uses `railway.json` and the root `Dockerfile`. Health checks target `/api/health`.

### Render

1. Create a Blueprint or Docker Web Service from this repository.
2. Use the root `Dockerfile`.
3. Add a persistent disk mounted at `/data`.
4. Set environment variables:

```bash
NODE_ENV=production
DATABASE_PATH=/data/collabjam.db
GIT_REPO_PATH=/data/repo
SONGS_PATH=/data/repo/songs
WORKTREES_PATH=/data/worktrees
WEB_ORIGIN=https://your-render-service.onrender.com
ADMIN_PASSWORD=choose-a-long-password
SESSION_SECRET=generate-at-least-32-random-characters
AGENT_RUNNER=mock
```

Render provides `PORT`, so do not hard-code it unless you are running the container yourself.

## Demo Repository

CollabJam is designed to use a separate GitHub repository for generated songs and PR demonstrations. That repository receives:

- `songs/<song-slug>/song.json`
- `songs/<song-slug>/parts/rhythm.json`
- `songs/<song-slug>/parts/harmony.json`
- `songs/<song-slug>/parts/bass.json`
- agent branches
- GitHub pull requests
- merge commits for final productions

A demo repository README template is included at:

```text
docs/demo-repository-readme.md
```

## Troubleshooting

### Create PRs button does nothing

Make sure you are logged in as admin and that all three agent role commits exist. If it fails, the dashboard should show the GitHub or Git error. You can also inspect:

```text
/api/admin/deployment
```

### GitHub says branches have no history in common

The app bridges unrelated demo repository history before creating PRs by merging remote `main` into each agent branch with an `ours` strategy. Redeploy the latest commit if you still see this.

### GitHub auth fails

Check:

```bash
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_REMOTE
```

The token must be able to push branches and create/merge pull requests in the demo repo.

### Production audio is silent

Use a modern browser such as Chrome, hard refresh after deployment, and click the playback button directly. Browser audio requires a user gesture. The app schedules Tone.js events directly from the merged JSON parts.

### Data disappears after redeploy

Your hosted app is missing persistent storage. Mount a Railway volume or Render disk at:

```text
/data
```

## Project Status

Phases 1-7 are implemented:

1. Foundation
2. Music domain and Tone.js playback
3. Git worktrees
4. Codex agent runner
5. GitHub pull request workflow
6. Studio dashboard
7. Docker deployment for Railway and Render

## License

This repository is currently a demo project. Add a license before distributing it publicly.
