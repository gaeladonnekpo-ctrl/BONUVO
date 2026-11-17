import { ApiFootballProvider } from "@/modules/ai/providers/api-football";
import { EspnSoccerProvider } from "@/modules/ai/providers/espn-soccer";
import type { SportsDataProvider } from "@/modules/ai/providers/types";
import { getServerEnv } from "@/server/env";

export function createActiveSportsDataProvider(): SportsDataProvider {
  const env = getServerEnv();
  if (env.API_FOOTBALL_KEY?.trim()) {
    return new ApiFootballProvider();
  }
  return new EspnSoccerProvider();
}
