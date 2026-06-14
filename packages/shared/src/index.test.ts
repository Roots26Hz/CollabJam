import { describe, expect, it } from "vitest";
import { agentRoleSchema, songSchema } from "./index.js";

describe("shared schemas", () => {
  it("accepts supported agent roles", () => {
    expect(agentRoleSchema.parse("rhythm")).toBe("rhythm");
    expect(agentRoleSchema.safeParse("lead").success).toBe(false);
  });

  it("validates a song", () => {
    const song = songSchema.parse({
      id: "7cc00a76-8775-4b07-aeda-289e04862af9",
      slug: "funk-80s-track",
      title: "Funk 80s Track",
      stylePrompt: "Punchy neon funk",
      bpm: 112,
      key: "A minor",
      timeSignature: "4/4",
      status: "draft",
      createdAt: "2026-06-14T10:00:00.000Z",
      updatedAt: "2026-06-14T10:00:00.000Z"
    });

    expect(song.slug).toBe("funk-80s-track");
  });
});
