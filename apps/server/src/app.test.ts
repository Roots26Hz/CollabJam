import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";
import { createDatabase } from "./database.js";

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createTestConfig(): AppConfig {
  const root = mkdtempSync(join(tmpdir(), "collabjam-tests-"));
  const repo = join(root, "repo");
  execFileSync("git", ["init", "-b", "main", repo]);
  git(repo, ["config", "user.name", "CollabJam Tests"]);
  git(repo, ["config", "user.email", "tests@collabjam.local"]);
  writeFileSync(join(repo, "README.md"), "test repo\n");
  git(repo, ["add", "README.md"]);
  git(repo, ["commit", "-m", "Initial commit"]);

  return {
    NODE_ENV: "test",
    PORT: 3001,
    WEB_ORIGIN: "http://localhost:5173",
    DATABASE_PATH: ":memory:",
    GIT_REPO_PATH: repo,
    SONGS_PATH: join(repo, "songs"),
    WORKTREES_PATH: join(root, "worktrees"),
    AGENT_RUNNER: "mock",
    CODEX_COMMAND: "codex",
    ADMIN_PASSWORD: "correct-horse",
    SESSION_SECRET: "a-test-secret-that-is-at-least-32-characters"
  };
}

type TestAgent = ReturnType<typeof request.agent>;

async function waitForJob(agent: TestAgent, jobId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await agent.get(`/api/jobs/${jobId}`).expect(200);
    if (["completed", "failed"].includes(response.body.job.status)) {
      return response.body;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Job ${jobId} did not finish`);
}

describe("server API", () => {
  let database: ReturnType<typeof createDatabase>;
  let app: ReturnType<typeof createApp>;
  let config: AppConfig;

  beforeEach(() => {
    config = createTestConfig();
    database = createDatabase(":memory:");
    app = createApp(config, database);
  });

  afterEach(() => database.close());

  it("reports service and database health", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body).toMatchObject({ status: "ok", database: "ok" });
  });

  it("rejects an invalid password", async () => {
    const response = await request(app)
      .post("/api/session/login")
      .send({ password: "incorrect" })
      .expect(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("logs in, authorizes protected actions, and logs out", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/session/login")
      .send({ password: "correct-horse" })
      .expect(200);
    await agent.post("/api/admin/check").expect(204);
    await agent.post("/api/session/logout").expect(200);
    await agent.post("/api/admin/check").expect(401);
  });

  it("returns the anonymous session state", async () => {
    const response = await request(app).get("/api/session").expect(200);
    expect(response.body).toEqual({ authenticated: false });
  });

  it("requires admin access to create songs", async () => {
    await request(app)
      .post("/api/songs")
      .send({
        title: "Neon Drive",
        stylePrompt: "Retro synth funk",
        bpm: 112,
        key: "A minor",
        timeSignature: "4/4"
      })
      .expect(401);
  });

  it("creates, lists, and returns a playable song", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/session/login")
      .send({ password: "correct-horse" })
      .expect(200);
    const created = await agent
      .post("/api/songs")
      .send({
        title: "Neon Drive",
        stylePrompt: "Retro synth funk",
        bpm: 112,
        key: "A minor",
        timeSignature: "4/4"
      })
      .expect(201);
    expect(created.body.parts).toHaveLength(3);
    expect(created.body.history.commits[0].message).toBe(
      "Create song: Neon Drive"
    );
    expect(created.body.history.branches).toHaveLength(3);

    const list = await request(app).get("/api/songs").expect(200);
    expect(list.body.songs[0].slug).toBe("neon-drive");

    const production = await request(app)
      .get("/api/songs/neon-drive")
      .expect(200);
    expect(production.body.parts[0].events.length).toBeGreaterThan(0);

    const history = await request(app)
      .get("/api/songs/neon-drive/history")
      .expect(200);
    expect(
      history.body.branches.map((branch: { role: string }) => branch.role)
    ).toEqual(["bass", "harmony", "rhythm"]);
    expect(
      git(config.GIT_REPO_PATH, ["branch", "--list", "neon-drive/rhythm"])
    ).toContain("neon-drive/rhythm");
    expect(git(config.GIT_REPO_PATH, ["worktree", "list"])).toContain(
      join(config.WORKTREES_PATH, "neon-drive", "rhythm")
    );
  });

  it("runs three mock agents in parallel and commits each role branch", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/session/login")
      .send({ password: "correct-horse" })
      .expect(200);
    await agent
      .post("/api/songs")
      .send({
        title: "Agent Jam",
        stylePrompt: "Tight parallel funk",
        bpm: 118,
        key: "D minor",
        timeSignature: "4/4"
      })
      .expect(201);

    const unauthorized = await request(app)
      .post("/api/songs/agent-jam/generate")
      .send()
      .expect(401);
    expect(unauthorized.body.error.code).toBe("AUTHENTICATION_REQUIRED");

    const started = await agent
      .post("/api/songs/agent-jam/generate")
      .send()
      .expect(202);
    const summary = await waitForJob(agent, started.body.job.id);
    expect(summary.job.status).toBe("completed");
    expect(summary.runs.map((run: { status: string }) => run.status)).toEqual([
      "committed",
      "committed",
      "committed"
    ]);

    const events = await agent
      .get(`/api/jobs/${started.body.job.id}/events`)
      .buffer(true)
      .parse((response, callback) => {
        let body = "";
        response.on("data", (chunk: Buffer) => {
          body += chunk.toString();
          if (body.includes("All agent branches are ready for review.")) {
            (response as unknown as { destroy: () => void }).destroy();
          }
        });
        response.on("close", () => callback(null, body));
      });
    expect(String(events.body)).toContain("Parallel agents started.");

    const history = await agent.get("/api/songs/agent-jam/history").expect(200);
    const roleCommits = history.body.commits.filter(
      (commit: { role: string | null }) => commit.role
    );
    expect(roleCommits).toHaveLength(3);
    expect(
      roleCommits.map((commit: { message: string }) => commit.message).sort()
    ).toEqual([
      "Bass agent: generate initial pattern v1",
      "Harmony agent: generate initial pattern v1",
      "Rhythm agent: generate initial pattern v1"
    ]);
    expect(
      git(config.GIT_REPO_PATH, ["log", "--oneline", "agent-jam/rhythm", "-1"])
    ).toContain("Rhythm agent: generate initial pattern v1");
  });

  it("keeps unknown API routes as structured JSON errors", async () => {
    const response = await request(app).get("/api/missing").expect(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("serves the React entry point for production client routes", async () => {
    const productionApp = createApp(
      { ...config, NODE_ENV: "production" },
      database
    );
    const response = await request(productionApp)
      .get("/songs/funk-80s-track")
      .expect(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("<title>CollabJam Studio</title>");
  });
});
