import type { DecisionRoleProvider } from "./decision-roles.provider";
import { MockDecisionRoleProvider } from "./mock-decision-roles.provider";

export function createDecisionRoleProvider(providerId: string): DecisionRoleProvider {
  if (providerId === "mock") {
    return new MockDecisionRoleProvider();
  }

  // Future: return OpenAiDecisionRoleProvider if 'openai'

  console.warn(`DecisionRoleProvider '${providerId}' not found. Falling back to 'mock'.`);
  return new MockDecisionRoleProvider();
}
