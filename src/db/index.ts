import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url =
  process.env.DATABASE_URL ??
  "postgres://crowdpoll:crowdpoll@127.0.0.1:5435/crowdpoll";

// A single client per server process; `prepare: false` keeps it compatible
// with transaction-mode connection poolers (Neon, Supabase, pgbouncer).
const client = postgres(url, { prepare: false });

export const db = drizzle(client, { schema });
export type Db = typeof db;
