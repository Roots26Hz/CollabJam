#!/usr/bin/env sh
set -eu

: "${DATABASE_PATH:=/data/collabjam.db}"
: "${GIT_REPO_PATH:=/data/repo}"
: "${SONGS_PATH:=${GIT_REPO_PATH}/songs}"
: "${WORKTREES_PATH:=/data/worktrees}"
: "${GIT_AUTHOR_NAME:=CollabJam Studio}"
: "${GIT_AUTHOR_EMAIL:=collabjam@example.local}"

mkdir -p "$(dirname "$DATABASE_PATH")" "$GIT_REPO_PATH" "$SONGS_PATH" "$WORKTREES_PATH"

seed_runtime_repo() {
  cp -R /app/apps "$GIT_REPO_PATH"/
  cp -R /app/packages "$GIT_REPO_PATH"/
  cp -R /app/songs "$GIT_REPO_PATH"/
  cp /app/package.json /app/package-lock.json /app/tsconfig.base.json "$GIT_REPO_PATH"/
  cp /app/eslint.config.js /app/prettier.config.js /app/vitest.config.ts "$GIT_REPO_PATH"/
  cp /app/README.md /app/.gitignore /app/.env.example "$GIT_REPO_PATH"/
}

if [ ! -d "$GIT_REPO_PATH/.git" ]; then
  seed_runtime_repo
  git -C "$GIT_REPO_PATH" init -b main
  git -C "$GIT_REPO_PATH" config user.name "$GIT_AUTHOR_NAME"
  git -C "$GIT_REPO_PATH" config user.email "$GIT_AUTHOR_EMAIL"
  git -C "$GIT_REPO_PATH" add .
  git -C "$GIT_REPO_PATH" commit -m "Initialize CollabJam runtime repository" >/dev/null
else
  git -C "$GIT_REPO_PATH" config user.name "$GIT_AUTHOR_NAME"
  git -C "$GIT_REPO_PATH" config user.email "$GIT_AUTHOR_EMAIL"
fi

if [ -n "${GITHUB_OWNER:-}" ] && [ -n "${GITHUB_REPO:-}" ]; then
  github_remote_url="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git"
  if git -C "$GIT_REPO_PATH" remote get-url "${GITHUB_REMOTE:-origin}" >/dev/null 2>&1; then
    git -C "$GIT_REPO_PATH" remote set-url "${GITHUB_REMOTE:-origin}" "$github_remote_url"
  else
    git -C "$GIT_REPO_PATH" remote add "${GITHUB_REMOTE:-origin}" "$github_remote_url"
  fi
fi

if [ -n "${GITHUB_TOKEN:-}" ]; then
  git_askpass="/tmp/collabjam-git-askpass.sh"
  cat >"$git_askpass" <<'EOF'
#!/usr/bin/env sh
case "$1" in
  *Username*) printf '%s\n' "x-access-token" ;;
  *Password*) printf '%s\n' "$GITHUB_TOKEN" ;;
  *) printf '%s\n' "" ;;
esac
EOF
  chmod +x "$git_askpass"
  export GIT_ASKPASS="$git_askpass"
  export GIT_TERMINAL_PROMPT=0
fi

exec "$@"
