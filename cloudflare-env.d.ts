/* eslint-disable @typescript-eslint/no-explicit-any */
type D1Database = any;

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: { DB: D1Database };
}
