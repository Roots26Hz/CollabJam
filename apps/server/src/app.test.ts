import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "./app.js";
import type { AppConfig } from "./config.js";
import { createDatabase } from "./database.js";

const config: AppConfig = {
  NODE_ENV: "test",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:5173",
  DATABASE_PATH: ":memory:",
  SONGS_PATH: join(mkdtempSync(join(tmpdir(), "collabjam-tests-")), "songs"),
  ADMIN_PASSWORD: "correct-horse",
  SESSION_SECRET: "a-test-secret-that-is-at-least-32-characters"
};

describe("server API", () => {
  let database: ReturnType<typeof createDatabase>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
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

    const list = await request(app).get("/api/songs").expect(200);
    expect(list.body.songs[0].slug).toBe("neon-drive");

    const production = await request(app)
      .get("/api/songs/neon-drive")
      .expect(200);
    expect(production.body.parts[0].events.length).toBeGreaterThan(0);
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
