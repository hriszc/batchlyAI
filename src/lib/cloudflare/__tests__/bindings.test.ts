import { describe, expect, it, afterEach } from "vitest";
import { getD1Binding, getKvBinding } from "@/lib/cloudflare/bindings";

describe("getD1Binding", () => {
  afterEach(() => { delete (globalThis as any).__env__; });
  it("returns undefined when no env", () => expect(getD1Binding()).toBeUndefined());
  it("returns binding when configured", () => {
    (globalThis as any).__env__ = { batchlyai_db: { mock: true } };
    expect(getD1Binding()).toEqual({ mock: true });
  });
});

describe("getKvBinding", () => {
  afterEach(() => { delete (globalThis as any).__env__; });
  it("returns undefined when no env", () => expect(getKvBinding()).toBeUndefined());
  it("returns binding when configured", () => {
    (globalThis as any).__env__ = { batchlyai_kv: { mock: true } };
    expect(getKvBinding()).toEqual({ mock: true });
  });
});
