import "server-only";

export interface HealthReport {
  status: "ok" | "degraded";
  app: "ok";
  database: "ok" | "unavailable";
  timestamp: string;
}

export async function evaluateHealth(
  checkDatabase: () => Promise<boolean>,
): Promise<{ statusCode: 200 | 503; body: HealthReport }> {
  let dbHealthy = false;
  try {
    dbHealthy = await checkDatabase();
  } catch {
    dbHealthy = false;
  }

  const status = dbHealthy ? "ok" : "degraded";
  return {
    statusCode: dbHealthy ? 200 : 503,
    body: {
      status,
      app: "ok",
      database: dbHealthy ? "ok" : "unavailable",
      timestamp: new Date().toISOString(),
    },
  };
}
