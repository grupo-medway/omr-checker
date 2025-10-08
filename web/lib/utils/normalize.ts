export function normalizeAnswer(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim().toUpperCase();
  return trimmed === "" ? "UNMARKED" : trimmed;
}

export function normalizeRaw(value: string | null | undefined): string {
  return (value ?? "").trim();
}
