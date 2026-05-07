import { afterEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "@/lib/email";

describe("sendEmail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__env__;
  });

  it("returns true when Cloudflare Email binding succeeds", async () => {
    (globalThis as Record<string, unknown>).__env__ = {
      EMAIL: { send: vi.fn().mockResolvedValue(undefined) },
    };

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Hello",
      html: "<p>Test</p>",
    });
    expect(result).toBe(true);
  });

  it("returns false when Cloudflare Email binding throws", async () => {
    (globalThis as Record<string, unknown>).__env__ = {
      EMAIL: { send: vi.fn().mockRejectedValue(new Error("send failed")) },
    };

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Hello",
      html: "<p>Test</p>",
    });
    expect(result).toBe(false);
  });

  it("falls back to MailChannels when no Email binding", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Hello",
      html: "<p>Test</p>",
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.mailchannels.net/tx/v1/send",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("returns false when MailChannels returns non-ok status", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue("Internal Server Error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Hello",
      html: "<p>Test</p>",
    });

    expect(result).toBe(false);
  });

  it("returns false when MailChannels fetch throws", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network error"));
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendEmail({
      to: "test@example.com",
      subject: "Hello",
      html: "<p>Test</p>",
    });

    expect(result).toBe(false);
  });

  it("MailChannels request has correct format", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("") });
    vi.stubGlobal("fetch", mockFetch);

    await sendEmail({
      to: "user@example.com",
      subject: "Subject",
      html: "<p>Body</p>",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.personalizations).toEqual([{ to: [{ email: "user@example.com" }] }]);
    expect(body.from.email).toBe("support@batchlyai.com");
    expect(body.subject).toBe("Subject");
    expect(body.content).toEqual([{ type: "text/html", value: "<p>Body</p>" }]);
  });
});
