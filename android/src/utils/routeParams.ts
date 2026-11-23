export function parseRouteParam(
  value: string | string[] | undefined
): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  return raw;
}

export function parseRouteGameMode(
  value: string | string[] | undefined
): "bot" | "pvp" | undefined {
  const raw = parseRouteParam(value);
  if (raw === "bot" || raw === "pvp") return raw;
  return undefined;
}
