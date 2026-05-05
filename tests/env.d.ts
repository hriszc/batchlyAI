// Cloudflare Workers types for test environment
declare var D1Database: any;
declare class KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
declare class R2Bucket {}
