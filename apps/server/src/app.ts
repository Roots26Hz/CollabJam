import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import type { AppConfig } from "./config.js";
import { errorHandler, notFound } from "./errors.js";
import { createGitEngine } from "./git.js";
import { createSessionHandlers } from "./session.js";
import { createSongStore } from "./songs.js";

export function createApp(config: AppConfig, database: DatabaseSync) {
  const app = express();
  app.set("env", config.NODE_ENV);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(pinoHttp());
  app.use(
    helmet({
      contentSecurityPolicy:
        config.NODE_ENV === "production" ? undefined : false
    })
  );
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "64kb" }));

  const sessions = createSessionHandlers(
    config.ADMIN_PASSWORD,
    config.SESSION_SECRET
  );
  const git = createGitEngine(
    database,
    config.GIT_REPO_PATH,
    config.WORKTREES_PATH
  );
  const songs = createSongStore(database, config.SONGS_PATH, git);

  app.get("/api/health", (_request, response) => {
    database.prepare("SELECT 1").get();
    response.json({
      status: "ok",
      database: "ok",
      timestamp: new Date().toISOString()
    });
  });
  app.get("/api/session", sessions.getSession);
  app.post("/api/session/login", sessions.login);
  app.post("/api/session/logout", sessions.logout);
  app.post("/api/admin/check", sessions.requireAdmin, (_request, response) => {
    response.status(204).end();
  });
  app.get("/api/songs", (_request, response) => {
    response.json({ songs: songs.listSongs() });
  });
  app.get("/api/songs/:slug", (request, response) => {
    response.json(songs.getSong(request.params.slug));
  });
  app.get("/api/songs/:slug/history", (request, response) => {
    response.json(songs.getHistory(request.params.slug));
  });
  app.post("/api/songs", sessions.requireAdmin, (request, response) => {
    response.status(201).json(songs.createSong(request.body));
  });

  app.use("/api", notFound);

  const webDist = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../web/dist"
  );
  if (config.NODE_ENV === "production" && existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get("/{*path}", (_request, response) =>
      response.sendFile(resolve(webDist, "index.html"))
    );
  } else {
    app.use(notFound);
  }

  app.use(errorHandler);
  return app;
}
