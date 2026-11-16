export interface ShowcaseEnvironment {
  readonly NODE_ENV?: string;
  readonly APP_ENV?: string;
  readonly VERCEL_ENV?: string;
  readonly ALLOW_DEV_SHOWCASE?: string;
}

/**
 * Strictly blocks `/admin/design` in production runtimes so dev fixtures never appear live.
 */
export function isDesignShowcaseEnabled(env: ShowcaseEnvironment = process.env): boolean {
  if (env.APP_ENV === "production" || env.VERCEL_ENV === "production") {
    return false;
  }

  if (env.NODE_ENV === "production") {
    return env.APP_ENV === "local" && env.ALLOW_DEV_SHOWCASE === "1";
  }

  return true;
}
