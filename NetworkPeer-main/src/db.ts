import pg from "pg";
import Redis from "ioredis";
import { config } from "./config.js";

const { Pool } = pg;

/**
 * PostgreSQL pool. PostGIS support is enabled through the `postgis` extension
 * installed on the database (see migrations/001), so no extra client options
 * are required beyond the connection string.
 */
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  min: config.DATABASE_POOL_MIN,
  max: config.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected PostgreSQL pool error", err);
});

function createRedis() {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  client.on("error", () => {
    // Logged via the caller's Pino logger in production; kept minimal here.
  });
  return client;
}

export const redis = createRedis();

/** Disconnect all shared resources during graceful shutdown. */
export async function closeConnections(): Promise<void> {
  await Promise.allSettled([pool.end(), redis.quit()]);
}
