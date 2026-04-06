import { cookies } from "next/headers";
import { DevWarningDialog } from "./dev-warning-dialog";

const ENV_LABELS: Record<string, string> = {
  "dev.": "Development",
  "stg.": "Staging",
};

function getEnvLabel(): string | null {
  const url = process.env.AUTH_URL ?? "";
  for (const [pattern, label] of Object.entries(ENV_LABELS)) {
    if (url.includes(pattern)) return label;
  }
  return null;
}

export async function DevWarning() {
  const envLabel = getEnvLabel();
  if (!envLabel) return null;

  const cookieStore = await cookies();
  if (cookieStore.get("staging_acknowledged")) return null;

  return <DevWarningDialog envLabel={envLabel} />;
}
