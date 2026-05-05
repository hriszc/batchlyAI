// Cloudflare Workers runtime type declarations.
// These types are available as global bindings at runtime but not in the TS type system.

declare class D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  exec(query: string): Promise<D1Result>;
}

declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

declare interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
  error?: string;
}

declare class KVNamespace {
  get(key: string, options?: { type: "text" }): Promise<string | null>;
  get(key: string, options: { type: "json" }): Promise<unknown>;
  get(key: string, options?: { type?: "text" | "json" | "arrayBuffer" | "stream" }): Promise<unknown>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVNamespacePutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;
}

declare interface KVNamespacePutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

declare interface KVNamespaceListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

declare interface KVNamespaceListResult {
  keys: { name: string; expiration?: number; metadata?: Record<string, unknown> }[];
  list_complete: boolean;
  cursor?: string;
}
