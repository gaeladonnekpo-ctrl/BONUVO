const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

export function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  const safe = FORMULA_PREFIX_REGEX.test(str) ? `'${str}` : str;
  if (/[",\n\r;]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildCsvDocument(
  headers: readonly string[],
  rows: readonly ReadonlyArray<string | number | null | undefined>[],
): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(",");
  const bodyLines = rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(","));
  return [headerLine, ...bodyLines].join("\r\n");
}
