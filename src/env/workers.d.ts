declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
  exec(query: string): Promise<D1Result>;
  dump(): Promise<ArrayBuffer>;
}

declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
  raw<T = unknown>(): Promise<T[]>;
}

declare interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: Record<string, unknown>;
}

declare interface KVNamespace {
  get(key: string, options?: KVNamespaceGetOptions): Promise<string | null>;
  get(key: string, type: "json"): Promise<unknown>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer>;
  get(key: string, type: "stream"): Promise<ReadableStream>;
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: KVNamespacePutOptions,
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;
}

declare interface KVNamespaceGetOptions {
  type?: "text" | "json" | "arrayBuffer" | "stream";
}

declare interface KVNamespacePutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

declare interface KVNamespaceListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

declare interface KVNamespaceListResult {
  keys: KVNamespaceListKey[];
  list_complete: boolean;
  cursor?: string;
}

declare interface KVNamespaceListKey {
  name: string;
  expiration?: number;
  metadata?: Record<string, unknown>;
}
declare module "html2canvas";

declare interface Ai {
  run(model: string, input: Record<string, unknown>): Promise<Record<string, unknown>>;
}
