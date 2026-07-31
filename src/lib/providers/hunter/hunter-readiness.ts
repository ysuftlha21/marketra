import { parseServerEnv } from "@/lib/env/env";

export function getHunterReadiness(): { configured: boolean; enabled: boolean; message: string } {
  const env = parseServerEnv();
  const configured = Boolean(env.HUNTER_API_KEY && env.HUNTER_BASE_URL.startsWith("https://"));
  return {
    configured,
    enabled: env.HUNTER_DISCOVERY_UI_ENABLED,
    message: !configured
      ? "Hunter credentials are not configured."
      : env.HUNTER_DISCOVERY_UI_ENABLED
        ? "Hunter UI activation is ready."
        : "Hunter is configured but UI activation remains disabled.",
  };
}
