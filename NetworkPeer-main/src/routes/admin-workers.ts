import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { fail, ok } from "../contracts.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { AdminWorkerServiceError, adminWorkerService } from "../services/admin-worker-service.js";
import { getWorkerEligibleRoles, setWorkerEligibleRoles } from "../repository.js";

const workerParamsSchema = z.object({ workerId: z.string().uuid() }).strict();
const verificationSchema = z.object({
  verification_status: z.enum(["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"]),
  is_available: z.boolean().default(false),
  reason: z.string().trim().min(3).max(2_000),
}).strict();

const roleActionSchema = z.object({
  role: z.enum(["correctionist", "collectionist"]),
  action: z.enum(["grant", "revoke"]),
}).strict();

function handleAdminWorkerError(request: FastifyRequest, reply: FastifyReply, err: unknown): unknown {
  if (err instanceof AdminWorkerServiceError) {
    return reply.code(err.statusCode).send(fail(err.code, err.message));
  }
  request.log.error({ err }, "admin worker update failed");
  return reply.code(500).send(fail("INTERNAL_SERVER_ERROR", "An internal server error occurred"));
}

export default async function adminWorkerRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (child) => {
    child.addHook("onRequest", requireAuth);
    child.addHook("onRequest", requireRole(["ADMIN"]));

    child.patch("/admin/workers/:workerId/verification", async (request, reply) => {
      const params = workerParamsSchema.safeParse(request.params);
      const body = verificationSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.code(400).send(fail("VALIDATION_ERROR", "Invalid worker verification update"));
      }
      try {
        const profile = await adminWorkerService.setVerification(
          request.auth.userId,
          params.data.workerId,
          body.data.verification_status,
          body.data.is_available,
          body.data.reason,
        );
        return ok(profile);
      } catch (err) {
        return handleAdminWorkerError(request, reply, err);
      }
    });

    // Revision 5 §22.3: Admin-only endpoint to Grant or Revoke worker roles (e.g. correctionist)
    child.post("/admin/workers/:workerId/roles", async (request, reply) => {
      const params = workerParamsSchema.safeParse(request.params);
      const body = roleActionSchema.safeParse(request.body);
      if (!params.success || !body.success) {
        return reply.code(400).send(fail("VALIDATION_ERROR", "Invalid worker role update request"));
      }
      try {
        const currentRoles = await getWorkerEligibleRoles(params.data.workerId);
        let updatedRoles = [...currentRoles];
        if (body.data.action === "grant") {
          if (!updatedRoles.includes(body.data.role)) {
            updatedRoles.push(body.data.role);
          }
        } else {
          updatedRoles = updatedRoles.filter((r) => r !== body.data.role);
          if (updatedRoles.length === 0) updatedRoles = ["collectionist"];
        }
        await setWorkerEligibleRoles(params.data.workerId, updatedRoles);
        return ok({
          workerId: params.data.workerId,
          eligibleRoles: updatedRoles,
          action: body.data.action,
        });
      } catch (err) {
        return handleAdminWorkerError(request, reply, err);
      }
    });
  });
}

