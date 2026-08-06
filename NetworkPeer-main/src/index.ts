import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./config.js";
import { pool, redis, closeConnections } from "./db.js";
import { fail } from "./contracts.js";
import systemRoutes from "./routes/system.js";
import authRoutes from "./routes/auth.js";
import clientJobsRoutes from "./routes/client-jobs.js";
import workerJobsRoutes from "./routes/worker-jobs.js";
import adminWorkerRoutes from "./routes/admin-workers.js";
import workRoutes from "./routes/work.js";
import { requireAuth } from "./middleware/auth.js";
import { requireRateLimit } from "./middleware/rate-limit.js";
import { WorkEvidenceService } from "./services/work-evidence-service.js";
import type { MediaStorage } from "./services/media-storage-service.js";

function getErrorResponseDetails(err: unknown): {
  code: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_SERVER_ERROR";
  message: string;
  statusCode: number;
} {
  const maybeError = err as { message?: unknown; statusCode?: unknown };
  const statusCode = typeof maybeError.statusCode === "number" && maybeError.statusCode < 500
    ? maybeError.statusCode
    : 500;

  // Never leak raw internal messages (DB details, stack traces) to clients.
  const message = statusCode < 500 && typeof maybeError.message === "string"
    ? maybeError.message
    : "An internal server error occurred";

  const code =
    statusCode === 401 ? "UNAUTHORIZED"
    : statusCode === 403 ? "FORBIDDEN"
    : statusCode === 404 ? "NOT_FOUND"
    : statusCode < 500 ? "BAD_REQUEST"
    : "INTERNAL_SERVER_ERROR";

  return { code, message, statusCode };
}

/**
 * Application bootstrap: plugin registration, route mounting, and graceful
 * shutdown hooks. Routes are declared in src/routes and mounted under
 * config.API_PREFIX.
 */
export type BuildAppOptions = {
  mediaStorage?: MediaStorage;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: config.MAX_REQUEST_BODY_BYTES,
    logger: {
      level: config.LOG_LEVEL,
      transport: config.LOG_PRETTY === "true" ? { target: "pino-pretty" } : undefined,
    },
  });

  app.addHook("onRequest", requireRateLimit);

  app.register(systemRoutes, { prefix: config.API_PREFIX });
  app.register(authRoutes, { prefix: config.API_PREFIX });
  app.register(clientJobsRoutes, { prefix: config.API_PREFIX });
  app.register(workerJobsRoutes, { prefix: config.API_PREFIX });
  app.register(adminWorkerRoutes, { prefix: config.API_PREFIX });
  const evidenceService = options.mediaStorage ? new WorkEvidenceService(options.mediaStorage) : new WorkEvidenceService();
  app.register(workRoutes, {
    prefix: config.API_PREFIX,
    evidenceService,
  });

  if (config.NODE_ENV === "production") {
    app.addHook("onReady", async () => {
      await evidenceService.assertStorageReady();
    });
  }

  // Authenticated, role-guarded example to exercise requireAuth + requireRole.
  app.get(
    `${config.API_PREFIX}/protected`,
    { onRequest: [requireAuth] },
    async (request) => {
      return { success: true, data: { user: request.auth }, error: null };
    },
  );

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(fail("NOT_FOUND", `Route ${request.method} ${request.url} not found`));
  });

  app.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, "unhandled error");
    const { code, message, statusCode } = getErrorResponseDetails(err);
    reply.code(statusCode).send(fail(code, message));
  });

  return app;
}

async function start(): Promise<void> {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await closeConnections();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: config.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    await closeConnections();
    process.exit(1);
  }
}

// Only auto-start when executed directly (keeps vitest/supertest imports side-effect free).
if (process.argv[1] && require.main === module) {
  void start();
}

export { pool, redis };
