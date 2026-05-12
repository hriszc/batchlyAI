import { describe, expect, it } from "vitest";

import * as schema from "@/lib/db/schema";
describe("DB schema", () => {
  it("exports user table", () => expect(schema.user).toBeDefined());
  it("exports credit_purchase table", () => expect(schema.creditPurchase).toBeDefined());
  it("exports shared_batch table", () => expect(schema.sharedBatch).toBeDefined());
  it("exports generation table", () => expect(schema.generation).toBeDefined());
  it("exports credit_audit_event table", () => expect(schema.creditAuditEvent).toBeDefined());
});
