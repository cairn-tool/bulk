/**
 * Small validators shared by the configuration loader. Each throws an `Error`
 * whose message names the offending key, so a typo surfaces as
 * `Unknown plugins key: ntsb-report` rather than as a silently ignored setting.
 */

export function object(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${name} must be a mapping`);
  return value as Record<string, unknown>;
}

export function knownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  name: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`Unknown ${name} key: ${key}`);
  }
}

export function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${name} must be a string`);
  return value;
}

export function optionalNumber(value: unknown, name: string, min = 0): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min)
    throw new Error(`${name} must be a number >= ${min}`);
  return value;
}

export function optionalBoolean(value: unknown, name: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new Error(`${name} must be true or false`);
  return value;
}

export function stringRecord(value: unknown, name: string): Record<string, string> {
  if (value === undefined || value === null) return {};
  const record = object(value, name);
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry !== "string") throw new Error(`${name}.${key} must be a string`);
    out[key] = entry;
  }
  return out;
}

export function numberRecord(value: unknown, name: string): Record<string, number> {
  if (value === undefined || value === null) return {};
  const record = object(value, name);
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(record)) {
    const n = optionalNumber(entry, `${name}.${key}`);
    if (n !== undefined) out[key] = n;
  }
  return out;
}
