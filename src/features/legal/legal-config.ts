import { parseServerEnv } from "@/lib/env/env";

export function getLegalConfig() {
  const env = parseServerEnv();
  return {
    effectiveDate: env.LEGAL_EFFECTIVE_DATE,
    supportEmail: env.SUPPORT_EMAIL,
    operatorName: "[Operator legal name required]",
    operatorAddress: "[Operator registered address required]",
  } as const;
}
