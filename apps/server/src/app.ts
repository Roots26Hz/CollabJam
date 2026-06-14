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
import { createSessionHandlers } from "./session.js";

export function createApp(config: AppConfig, database: DatabaseSync) {
  const app = express();
  app.set("env", config.NODE_ENV);
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
