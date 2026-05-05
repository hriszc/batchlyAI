import { describe, it, expect } from "vitest";

import { getApiMethod } from "../auth/$";

// We can't fully instantiate Better Auth in tests, but we can verify the routing table.
// Test the API_MAP mapping logic directly.

describe("getApiMethod — auth routing table", () => {
  // Mock auth object with stubbed api methods
  function mockAuth() {
    const methods = {
      signUpEmail: "signUpEmail",
      signInEmail: "signInEmail",
      signOut: "signOut",
      getSession: "getSession",
      forgetPassword: "forgetPassword",
      resetPassword: "resetPassword",
      verifyEmail: "verifyEmail",
      sendVerificationEmail: "sendVerificationEmail",
    };
    return {
      api: methods,
    } as any;
  }

  it("maps sign-up/email to signUpEmail", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "sign-up/email");
    expect(method).toBe(auth.api.signUpEmail);
  });

  it("maps sign-in/email to signInEmail", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "sign-in/email");
    expect(method).toBe(auth.api.signInEmail);
  });

  it("maps sign-out to signOut", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "sign-out");
    expect(method).toBe(auth.api.signOut);
  });

  it("maps get-session to getSession", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "get-session");
    expect(method).toBe(auth.api.getSession);
  });

  it("maps forget-password to forgetPassword", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "forget-password");
    expect(method).toBe(auth.api.forgetPassword);
  });

  it("maps reset-password to resetPassword", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "reset-password");
    expect(method).toBe(auth.api.resetPassword);
  });

  it("maps verify-email to verifyEmail", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "verify-email");
    expect(method).toBe(auth.api.verifyEmail);
  });

  it("maps send-verification-email to sendVerificationEmail", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "send-verification-email");
    expect(method).toBe(auth.api.sendVerificationEmail);
  });

  it("returns undefined for unknown path", () => {
    const auth = mockAuth();
    const method = getApiMethod(auth, "unknown/path");
    expect(method).toBeUndefined();
  });

  it("all mapped paths are covered", () => {
    // Verify the routing table has exactly 8 known paths
    const knownPaths = [
      "sign-up/email",
      "sign-in/email",
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
