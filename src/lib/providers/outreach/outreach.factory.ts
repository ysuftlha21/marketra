import type { OutreachProvider } from "./outreach.provider";
import { MockOutreachProvider } from "./mock-outreach.provider";

export class OutreachProviderConfigError extends Error {
  constructor(providerId: string) {
    super(`Outreach provider '${providerId}' is not available.`);
    this.name = "OutreachProviderConfigError";
  }
}

export function createOutreachProvider(providerId: string): OutreachProvider {
  if (providerId === "mock") {
    return new MockOutreachProvider();
  }

  throw new OutreachProviderConfigError(providerId);
}
