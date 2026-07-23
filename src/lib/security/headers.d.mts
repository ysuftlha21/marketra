export function buildContentSecurityPolicy(production: boolean): string;
export function productionSecurityHeaders(
  production: boolean,
): Array<{ key: string; value: string }>;
