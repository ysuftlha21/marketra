const ENABLED = false;

interface CallStats {
  count: number;
  totalMs: number;
}

const stats = new Map<string, CallStats>();

function record(name: string, durationMs: number) {
  if (!ENABLED) return;
  const s = stats.get(name) ?? { count: 0, totalMs: 0 };
  s.count++;
  s.totalMs += durationMs;
  stats.set(name, s);
}

export function perfStart(_label: string): number {
  return ENABLED ? performance.now() : 0;
}

export function perfEnd(label: string, start: number) {
  if (!ENABLED) return;
  const duration = performance.now() - start;
  record(label, duration);
}

export function perfDump(): string {
  if (!ENABLED) return "";
  const lines: string[] = ["[perf]"];
  for (const [k, v] of stats) {
    lines.push(`  ${k}: ${v.count} calls, ${v.totalMs.toFixed(1)}ms total`);
  }
  const result = lines.join("\n");
  stats.clear();
  return result;
}
