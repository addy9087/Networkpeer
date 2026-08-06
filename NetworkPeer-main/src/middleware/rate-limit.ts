import type { onRequestHookHandler } from "fastify";
import { isRateLimited } from "../auth.js";
import { config } from "../config.js";
import { fail } from "../contracts.js";

/** Apply a Redis-backed fixed-window limit to every request source address. */
export const requireRateLimit: onRequestHookHandler = async (request, reply) => {
  // Liveness is deliberately dependency-free so orchestration can restart a
  // failed process. Database readiness remains rate-limited at /health.
  if (request.url.split("?")[0] === `${config.API_PREFIX}/live`) {
    return;
  }

  try {
    const limited = await isRateLimited(
      `rate:${request.ip}`,
      config.RATE_LIMIT_WINDOW_MS,
      config.RATE_LIMIT_MAX_REQUESTS,
    );
    if (limited) {
      return reply
        .code(429)
        .header("Retry-After", String(Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)))
        .send(fail("RATE_LIMITED", "Too many requests. Try again later."));
    }
  } catch (err) {
    request.log.error({ err }, "global rate limiter unavailable");
    return reply
      .code(503)
      .send(fail("RATE_LIMIT_UNAVAILABLE", "Request protection is temporarily unavailable"));
  }
};
