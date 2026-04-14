export type AppEnv = "local" | "development" | "staging" | "production";

export function getAppEnv(): AppEnv {
  return (process.env.NEXT_PUBLIC_APP_ENV as AppEnv) || "local";
}

export function isProduction(): boolean {
  return getAppEnv() === "production";
}
