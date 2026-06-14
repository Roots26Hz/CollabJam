import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import type { DatabaseSync } from "node:sqlite";
import {
  agentRoleSchema,
  branchSummarySchema,
  commitSummarySchema,
  songHistorySchema,
  type AgentRole,
  type BranchSummary,
  type CommitSummary,
  type Song,
  type SongHistory
} from "@collabjam/shared";

const roles = agentRoleSchema.options;

type CommitRow = {
  sha: string;
  song_id: string;
  role: AgentRole | null;
  branch: string;
  message: string;
  committed_at: string;
};

type BranchRow = {
  song_id: string;
  role: AgentRole;
  branch: string;
  worktree_path: string;
  status: "ready" | "missing";
  created_at: string;
};

function runGit(repoPath: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    const failure = error as Error & { stderr?: Buffer | string };
    const stderr = failure.stderr?.toString().trim();
    throw new Error(
      `git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`
    );
  }
}

function ensureInside(basePath: string, targetPath: string) {
  const relativePath = relative(
    realpathSync(basePath),
    realpathSync(targetPath)
  );
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Path escapes repository: ${targetPath}`);
  }
  return relativePath;
}

function rowToCommit(row: CommitRow): CommitSummary {
  return commitSummarySchema.parse({
    sha: row.sha,
    songId: row.song_id,
    role: row.role,
    branch: row.branch,
    message: row.message,
    committedAt: row.committed_at
  });
}

function rowToBranch(row: BranchRow): BranchSummary {
  return branchSummarySchema.parse({
    songId: row.song_id,
    role: row.role,
    branch: row.branch,
    worktreePath: row.worktree_path,
    status: existsSync(row.worktree_path) ? row.status : "missing",
    createdAt: row.created_at
  });
}

export function createGitEngine(
  database: DatabaseSync,
  repoPath: string,
  worktreesPath: string
) {
  const root = resolve(
    runGit(resolve(repoPath), ["rev-parse", "--show-toplevel"])
  );
  const worktreesRoot = resolve(worktreesPath);
  mkdirSync(worktreesRoot, { recursive: true });

  function commitSongBase(song: Song, songDirectory: string) {
    const relativeSongDirectory = ensureInside(root, songDirectory);
    runGit(root, ["add", relativeSongDirectory]);
    const status = runGit(root, [
      "status",
      "--porcelain",
      "--",
      relativeSongDirectory
    ]);
    if (!status) return null;

    const message = `Create song: ${song.title}`;
    runGit(root, ["commit", "-m", message]);
    const sha = runGit(root, ["rev-parse", "HEAD"]);
    const committedAt = runGit(root, ["show", "-s", "--format=%cI", sha]);
    database
      .prepare(
        "INSERT INTO commits (sha, song_id, role, branch, message, committed_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(sha, song.id, null, "main", message, committedAt);
    return rowToCommit({
      sha,
      song_id: song.id,
      role: null,
      branch: "main",
      message,
      committed_at: committedAt
    });
  }

  function createWorktrees(song: Song): BranchSummary[] {
    const createdAt = new Date().toISOString();
    const insert = database.prepare(
      `INSERT OR REPLACE INTO git_branches
       (song_id, role, branch, worktree_path, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    return roles.map((role) => {
      const branch = `${song.slug}/${role}`;
      const worktreePath = join(worktreesRoot, song.slug, role);
      mkdirSync(dirname(worktreePath), { recursive: true });

      const hasBranch = Boolean(
        runGit(root, ["branch", "--list", branch]).trim()
      );
      if (!existsSync(worktreePath)) {
        if (hasBranch) runGit(root, ["worktree", "add", worktreePath, branch]);
        else
          runGit(root, ["worktree", "add", "-b", branch, worktreePath, "main"]);
      }

      insert.run(song.id, role, branch, worktreePath, "ready", createdAt);
      return rowToBranch({
        song_id: song.id,
        role,
        branch,
        worktree_path: worktreePath,
        status: "ready",
        created_at: createdAt
      });
    });
  }

  function getHistory(songId: string): SongHistory {
    const commits = (
      database
        .prepare(
          "SELECT * FROM commits WHERE song_id = ? ORDER BY committed_at DESC"
        )
        .all(songId) as CommitRow[]
    ).map(rowToCommit);
    const branches = (
      database
        .prepare("SELECT * FROM git_branches WHERE song_id = ? ORDER BY role")
        .all(songId) as BranchRow[]
    ).map(rowToBranch);
    return songHistorySchema.parse({ commits, branches });
  }

  return { commitSongBase, createWorktrees, getHistory };
}
