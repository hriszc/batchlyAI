import "@tanstack/react-start/server-only";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/db/schema";

export function getDb(d1Binding: D1Database) {
  return drizzle(d1Binding, { schema, casing: "snake_case" });
}
