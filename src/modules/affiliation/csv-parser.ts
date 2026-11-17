export function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

export function parseCsvRecords(
  csvText: string,
  maxRows = 5000,
): {
  headers: string[];
  rows: Array<{ rowNumber: number; values: Record<string, string> }>;
} {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };
  const headerLine = lines[0]!;
  const delimiter = headerLine.includes(";") && !headerLine.includes(",") ? ";" : ",";
  const headers = splitCsvLine(headerLine, delimiter).map((h) => h.toLowerCase());

  const rows: Array<{ rowNumber: number; values: Record<string, string> }> = [];
  for (let i = 1; i < lines.length; i++) {
    if (rows.length >= maxRows) break;
    const cols = splitCsvLine(lines[i]!, delimiter);
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (key) record[key] = cols[c] ?? "";
    }
    rows.push({ rowNumber: i + 1, values: record });
  }
  return { headers, rows };
}

export function normalizeCsvConversionType(raw: string | undefined): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "reg" || v === "lead") return "registration";
  if (v === "ftd" || v === "sale") return "first_deposit";
  if (v === "cpa" || v === "dep") return "qualified";
  return v;
}
