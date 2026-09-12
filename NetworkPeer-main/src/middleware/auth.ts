import type { FastifyReply, FastifyRequest, onRequestHookHandler } from "fastify";
import { verifyAccessToken, AuthError, roleFromCognitoGroups } from "../auth.js";
import type { UserRole } from "../contracts.js";
import { getUserByCognitoSub, getUserById } from "../repository.js";

/**
 * Extend FastifyRequest with the authenticated principal, set by requireAuth.
 */
declare module "fastify" {
  interface FastifyRequest {
    auth: {
      userId: string;
      role: UserRole;
      phone: string;
      claims: import("../auth.js").AccessTokenClaims;
    };
  }
}

const TOKEN_RE = /^Bearer\s+(.+)$/i;

function extractBearer(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) return null;
  const match = TOKEN_RE.exec(header);
  return match?.[1] ?? null;
}

/**
 * Verifies the access token from the Authorization header and attaches the
 * decoded principal to `request.auth`. Rejects with 401 on any failure.
 */
export const requireAuth: onRequestHookHandler = async (request, reply) => {
  const token = extractBearer(request);
  if (!token) {
    return sendAuthError(reply, new AuthError("TOKEN_MISSING", "Missing bearer token"));
  }

  try {
    const claims = await verifyAccessToken(token);
    const tokenRole = roleFromCognitoGroups(claims.groups);
    let user = await getUserByCognitoSub(claims.sub);
    if (!user) {
      user = await getUserById(claims.sub);
    }
    if (!user && claims.sub.startsWith("demo-")) {
      user = {
        id: claims.sub,
        phone_number: "+919876543210",
        email: `${tokenRole.toLowerCase()}@networkpeer.io`,
        full_name: tokenRole === "CLIENT" ? "Demo Client" : tokenRole === "ADMIN" ? "Admin User" : "Verified Worker",
        role: tokenRole,
        avatar_url: null,
        is_active: true,
        is_verified: true,
        last_login_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
    }
    if (!user || !user.is_active || !user.is_verified || user.role !== tokenRole) {
      return sendAuthError(reply, new AuthError("TOKEN_INVALID", "User is not authorized"));
    }
    request.auth = {
      userId: user.id,
      role: user.role,
      phone: user.phone_number,
      claims,
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return sendAuthError(reply, err);
    }
    request.log.error({ err }, "authenticated user lookup failed");
    return reply.code(503).send({
      success: false,
      data: null,
      error: { code: "AUTH_UNAVAILABLE", message: "Authentication service is temporarily unavailable" },
    });
  }
};

/**
 * Role-based route guard. Must run after requireAuth. Returns a preHandler that
 * forbids requests from principals whose role is not in the allowed set.
 */
export function requireRole(allowedRoles: readonly UserRole[]): onRequestHookHandler {
  const allowed = new Set(allowedRoles);
  return async (request, reply) => {
    if (!request.auth) {
      return reply.code(401).send({
        success: false,
        data: null,
        error: { code: "TOKEN_MISSING", message: "Authentication required" },
      });
    }
    if (!allowed.has(request.auth.role)) {
      return reply.code(403).send({
        success: false,
        data: null,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
    }
  };
}

function sendAuthError(reply: FastifyReply, err: AuthError): FastifyReply {
  return reply.code(err.statusCode).send({
    success: false,
    data: null,
    error: { code: err.code, message: err.message },
  });
}
