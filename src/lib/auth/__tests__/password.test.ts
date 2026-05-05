import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("returns a string with pbkdf2$ prefix", async () => {
    const hash = await hashPassword("test123456");
    expect(hash).toMatch(/^pbkdf2\$/);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const h1 = await hashPassword("test123456");
    const h2 = await hashPassword("test123456");
    expect(h1).not.toBe(h2);
  });

  it("produces a hash with salt:key format after the prefix", async () => {
    const hash = await hashPassword("test123456");
    const parts = hash.slice("pbkdf2$".length).split(":");
    expect(parts).toHaveLength(2);
    // salt is 32 hex chars (16 bytes)
    expect(parts[0]).toHaveLength(32);
    // key is 128 hex chars (64 bytes)
    expect(parts[1]).toHaveLength(128);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword({ hash, password: "correct-password" });
    expect(result).toBe(true);
  });

  it("returns false for incorrect password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword({ hash, password: "wrong-password" });
    expect(result).toBe(false);
  });

  it("returns false for a non-pbkdf2 hash format", async () => {
    const result = await verifyPassword({ hash: "not-pbkdf2-format", password: "test" });
    expect(result).toBe(false);
  });

  it("returns false for a malformed pbkdf2 hash (missing colon)", async () => {
    const result = await verifyPassword({ hash: "pbkdf2$abc123nocolon", password: "test" });
    expect(result).toBe(false);
  });

  it("returns false for a hash with empty salt or key", async () => {
    const r1 = await verifyPassword({ hash: "pbkdf2$:", password: "test" });
    expect(r1).toBe(false);

    const r2 = await verifyPassword({ hash: "pbkdf2$salt:", password: "test" });
    expect(r2).toBe(false);

    const r3 = await verifyPassword({ hash: "pbkdf2$:key", password: "test" });
    expect(r3).toBe(false);
  });

  it("handles empty passwords", async () => {
    const hash = await hashPassword("");
    expect(await verifyPassword({ hash, password: "" })).toBe(true);
    expect(await verifyPassword({ hash, password: "x" })).toBe(false);
  });

  it("handles Unicode passwords", async () => {
    const hash = await hashPassword("密码123!@#");
    expect(await verifyPassword({ hash, password: "密码123!@#" })).toBe(true);
    expect(await verifyPassword({ hash, password: "密码123" })).toBe(false);
  });
});
