import { describe, expect, it } from "vitest";
import { evaluateHealth } from "@/server/health";

describe("health service", () => {
  it("retourne 200 et status=ok lorsque la base répond", async () => {
    const result = await evaluateHealth(async () => true);

    expect(result.statusCode).toBe(200);
    expect(result.body.status).toBe("ok");
    expect(result.body.app).toBe("ok");
    expect(result.body.database).toBe("ok");
    expect(result.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("retourne 503 et status=degraded lorsque la base est indisponible", async () => {
    const result = await evaluateHealth(async () => false);

    expect(result.statusCode).toBe(503);
    expect(result.body.status).toBe("degraded");
    expect(result.body.app).toBe("ok");
    expect(result.body.database).toBe("unavailable");
  });

  it("retourne 503 sans propager d'erreur interne si le contrôle lève une exception", async () => {
    const result = await evaluateHealth(async () => {
      throw new Error("postgres://secret:password@host/db connection failed");
    });

    expect(result.statusCode).toBe(503);
    expect(result.body.database).toBe("unavailable");
    expect(JSON.stringify(result.body)).not.toContain("secret");
    expect(JSON.stringify(result.body)).not.toContain("password");
  });
});
