import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_PATH: z.string().min(1).default("./data/collabjam.db"),
  ADMIN_PASSWORD: z.string().min(8),
  SESSION_SECRET: z.string().min(32)
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function parseConfig(environment: NodeJS.ProcessEnv): AppConfig {
  return environmentSchema.parse(environment);
}
