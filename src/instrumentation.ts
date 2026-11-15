export async function register(): Promise<void> {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    try {
      const { getServerEnv } = await import("@/server/env");
      getServerEnv();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[BONUVO] ${message}`);
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
      throw error;
    }
  }
}
