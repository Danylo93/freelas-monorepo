import { z } from "zod";
import { RequestService } from "../application/RequestService.js";
export function registerRequestRoutes(app, io) {
    app.post("/requests", async (req, rep) => {
        const schema = z.object({
            clientId: z.string(),
            serviceType: z.string(),
            lat: z.number(),
            lng: z.number(),
            bairro: z.string().optional(),
            details: z.string().optional(),
        });
        const r = schema.parse(req.body);
        const svc = new RequestService();
        const { requestId } = await svc.createRequest(r);
        io.to(`request:${requestId}`).emit("request:created", { ...r, requestId });
        return { ok: true, requestId };
    });
    app.post("/requests/:id/accept", async (req, rep) => {
        const { id } = req.params;
        const { providerId } = z.object({ providerId: z.string() }).parse(req.body);
        const svc = new RequestService();
        const ok = await svc.acceptRequest(id, providerId);
        if (!ok)
            return rep.status(409).send({ ok: false, reason: "Already accepted" });
        io.to(`request:${id}`).emit("accepted", { requestId: id, providerId });
        return { ok: true };
    });
}
