import "dotenv/config";
import { createApp } from "./app.js";
import { parseConfig } from "./config.js";
import { createDatabase } from "./database.js";

const config = parseConfig(process.env);
const database = createDatabase(config.DATABASE_PATH);
const app = createApp(config, database);

const server = app.listen(config.PORT, () => {
  console.log(`CollabJam server listening on http://localhost:${config.PORT}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
