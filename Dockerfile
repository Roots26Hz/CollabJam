FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ARG INSTALL_CODEX=true
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/* \
  && if [ "$INSTALL_CODEX" = "true" ]; then npm install -g @openai/codex; fi

COPY --from=build /app /app
RUN chmod +x /app/scripts/railway-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/collabjam.db
ENV GIT_REPO_PATH=/data/repo
ENV SONGS_PATH=/data/repo/songs
ENV WORKTREES_PATH=/data/worktrees
ENV AGENT_RUNNER=mock
ENV CODEX_COMMAND=codex
ENV CODEX_TIMEOUT_MS=300000
ENV GITHUB_REMOTE=origin

EXPOSE 3001

ENTRYPOINT ["/app/scripts/railway-entrypoint.sh"]
CMD ["npm", "start"]
