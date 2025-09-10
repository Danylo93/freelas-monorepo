import { z } from "zod";
import { ProviderService } from "../application/ProviderService.js";
export function registerProviderRoutes(app, io) {
    app.get("/", async () => {
        return { ok: true };
    });
    // Healthcheck is registered globally in server.ts
    app.post("/providers/register", async (req, rep) => {
        const schema = z.object({
            providerId: z.string().optional(),
            name: z.string(),
            lat: z.number(),
            lng: z.number(),
            radiusKm: z.number().min(1).max(50),
            serviceTypes: z.array(z.string()),
            bairroWhitelist: z.array(z.string()).optional(),
            isOnline: z.boolean().default(true),
        });
        const p = schema.parse(req.body);
        const svc = new ProviderService();
        const { providerId } = await svc.register(p);
        return { ok: true, providerId };
    });
    app.post("/providers/:id/location", async (req, rep) => {
        const { id } = req.params;
        const { lat, lng } = z.object({ lat: z.number(), lng: z.number() }).parse(req.body);
        const svc = new ProviderService();
        const ok = await svc.updateLocation(id, lat, lng);
        if (!ok)
            return { ok: false };
        io.to(`provider:${id}`).emit("provider:location", { providerId: id, lat, lng, ts: new Date().toISOString() });
        return { ok: true };
    });
}
