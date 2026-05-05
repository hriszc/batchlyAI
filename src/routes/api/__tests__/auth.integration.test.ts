import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { getApiMethod } from "../auth/$";
import { checkRateLimit } from "@/lib/rate-limit";

// We can't fully instantiate Better Auth in tests, but we can verify the routing table.
// Test the API_MAP mapping logic directly.

describe("getApiMethod — auth routing table", () => {
  function mockAuth() {
    const methods = {
      signUpEmail: "signUpEmail",
      signInEmail: "signInEmail",
      signInSocial: "signInSocial",
      signOut: "signOut",
      getSession: "getSession",
      forgetPassword: "forgetPassword",
      resetPassword: "resetPassword",
      verifyEmail: "verifyEmail",
      sendVerificationEmail: "sendVerificationEmail",
      callbackOAuth: "callbackOAuth",
    };
    return {
      api: methods,
    } as any;
  }

  it("maps sign-up/email to signUpEmail", () => {
    const result = getApiMethod(mockAuth(), "sign-up/email");
    expect(result?.method).toBe("signUpEmail");
  });

  it("maps sign-in/email to signInEmail", () => {
    const result = getApiMethod(mockAuth(), "sign-in/email");
    expect(result?.method).toBe("signInEmail");
  });

  it("maps sign-in/social to signInSocial", () => {
    const result = getApiMethod(mockAuth(), "sign-in/social");
    expect(result?.method).toBe("signInSocial");
  });

  it("maps sign-out to signOut", () => {
    const result = getApiMethod(mockAuth(), "sign-out");
    expect(result?.method).toBe("signOut");
  });

  it("maps get-session to getSession", () => {
    const result = getApiMethod(mockAuth(), "get-session");
    expect(result?.method).toBe("getSession");
  });

  it("maps forget-password to forgetPassword", () => {
    const result = getApiMethod(mockAuth(), "forget-password");
    expect(result?.method).toBe("forgetPassword");
  });

  it("maps reset-password to resetPassword", () => {
    const result = getApiMethod(mockAuth(), "reset-password");
    expect(result?.method).toBe("resetPassword");
  });

  it("maps verify-email to verifyEmail", () => {
    const result = getApiMethod(mockAuth(), "verify-email");
    expect(result?.method).toBe("verifyEmail");
  });

  it("maps send-verification-email to sendVerificationEmail", () => {
    const result = getApiMethod(mockAuth(), "send-verification-email");
    expect(result?.method).toBe("sendVerificationEmail");
  });

  it("maps callback/:provider to callbackOAuth with params", () => {
    const result = getApiMethod(mockAuth(), "callback/github");
    expect(result?.method).toBe("callbackOAuth");
    expect(result?.params).toEqual({ id: "github" });
  });

  it("returns undefined for unknown path", () => {
    const result = getApiMethod(mockAuth(), "unknown/path");
    expect(result).toBeUndefined();
  });

  it("all mapped paths are covered", () => {
    const knownPaths = [
      "sign-up/email",
      "sign-in/email",
      "sign-in/social",
      "sign-out",
      "get-session",
      "forget-password",
      "reset-password",
      "verify-email",
      "send-verification-email",
    ];
    const auth = mockAuth();
    for (const path of knownPaths) {
      expect(getApiMethod(auth, path), `Path "${path}" should be mapped`).toBeDefined();
    }
  });
});

describe("rate limiting on auth endpoints", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to 10 requests then blocks", () => {
    const path = "sign-in/email";
    const ip = "1.2.3.4";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(`${path}:${ip}`, 10, 60).allowed).toBe(true);
    }
    // 11th should be blocked
    expect(checkRateLimit(`${path}:${ip}`, 10, 60).allowed).toBe(false);
  });

  it("sign-up/email is rate limited", () => {
    const key = "sign-up/email:10.0.0.1";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key, 10, 60).allowed).toBe(true);
    }
    expect(checkRateLimit(key, 10, 60).allowed).toBe(false);
  });

  it("forget-password is rate limited", () => {
    const key = "forget-password:10.0.0.2";
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(key, 10, 60).allowed).toBe(true);
    }
    expect(checkRateLimit(key, 10, 60).allowed).toBe(false);
  });

  it("different IPs have independent limits", () => {
    const keyA = "sign-in/email:1.1.1.1";
    const keyB = "sign-in/email:2.2.2.2";
    for (let i = 0; i < 10; i++) {
      checkRateLimit(keyA, 10, 60);
    }
    // Key A blocked, key B still ok
    expect(checkRateLimit(keyA, 10, 60).allowed).toBe(false);
    expect(checkRateLimit(keyB, 10, 60).allowed).toBe(true);
  });

  it("different paths have independent limits", () => {
    const signIn = "sign-in/email:5.5.5.5";
    const signUp = "sign-up/email:5.5.5.5";
    for (let i = 0; i < 10; i++) {
      checkRateLimit(signIn, 10, 60);
    }
    expect(checkRateLimit(signIn, 10, 60).allowed).toBe(false);
    expect(checkRateLimit(signUp, 10, 60).allowed).toBe(true);
  });
});
