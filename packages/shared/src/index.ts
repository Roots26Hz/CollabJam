import { z } from "zod";

export const agentRoleSchema = z.enum(["rhythm", "harmony", "bass"]);
export type AgentRole = z.infer<typeof agentRoleSchema>;

export const songStatusSchema = z.enum([
  "draft",
  "generating",
  "review",
  "merged"
]);
export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "validating",
  "committed",
  "failed",
  "completed"
]);
export const pullRequestStatusSchema = z.enum([
  "open",
  "review",
  "merged",
  "closed"
]);

export const songSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(120),
  stylePrompt: z.string().min(1).max(1000),
  bpm: z.number().int().min(40).max(240),
  key: z.string().min(1).max(12),
  timeSignature: z.string().regex(/^\d+\/\d+$/),
  status: songStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const agentJobSchema = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  role: agentRoleSchema,
  status: jobStatusSchema,
  error: z.string().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable()
});

export const commitSummarySchema = z.object({
  sha: z.string().min(7),
  songId: z.string().uuid(),
  role: agentRoleSchema,
  branch: z.string().min(1),
  message: z.string().min(1),
  committedAt: z.string().datetime()
});

export const pullRequestSummarySchema = z.object({
  number: z.number().int().positive(),
  songId: z.string().uuid(),
  role: agentRoleSchema,
  title: z.string().min(1),
  url: z.string().url(),
  headBranch: z.string().min(1),
  baseBranch: z.string().min(1),
  status: pullRequestStatusSchema,
  createdAt: z.string().datetime(),
  mergedAt: z.string().datetime().nullable()
});

export const sessionSchema = z.object({ authenticated: z.boolean() });

export type Song = z.infer<typeof songSchema>;
export type SongStatus = z.infer<typeof songStatusSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type AgentJob = z.infer<typeof agentJobSchema>;
export type CommitSummary = z.infer<typeof commitSummarySchema>;
export type PullRequestSummary = z.infer<typeof pullRequestSummarySchema>;
export type PullRequestStatus = z.infer<typeof pullRequestStatusSchema>;
export type Session = z.infer<typeof sessionSchema>;
