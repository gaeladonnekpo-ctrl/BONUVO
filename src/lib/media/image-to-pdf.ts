/**
 * Wraps a JPEG byte buffer into a single-page PDF 1.4 document with exact aspect-ratio sizing.
 * Zero external dependencies; works identically in browser and Node.js.
 */
export function buildPdfFromJpegBytes(
  jpegBytes: Uint8Array,
  pixelWidth: number,
  pixelHeight: number,
): Uint8Array {
  // Fit to standard 595pt width while preserving exact aspect ratio
  const ptWidth = 595;
  const ptHeight = Math.round((pixelHeight / Math.max(1, pixelWidth)) * ptWidth * 100) / 100;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    byteLength += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    byteLength += b.length;
  };

  pushStr("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

  const startObj = (id: number) => {
    offsets[id] = byteLength;
    pushStr(`${id} 0 obj\n`);
  };

  // 1: Catalog
  startObj(1);
  pushStr("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // 2: Pages
  startObj(2);
  pushStr("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // 3: Page
  startObj(3);
  pushStr(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth} ${ptHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  // 4: Image XObject (DCTDecode = JPEG)
  startObj(4);
  pushStr(
    `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  pushBytes(jpegBytes);
  pushStr("\nendstream\nendobj\n");

  // 5: Drawing stream
  const drawCmd = `q\n${ptWidth} 0 0 ${ptHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  startObj(5);
  pushStr(`<< /Length ${drawCmd.length} >>\nstream\n${drawCmd}endstream\nendobj\n`);

  // Cross-reference table
  const xrefOffset = byteLength;
  pushStr("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i += 1) {
    const off = String(offsets[i] ?? 0).padStart(10, "0");
    pushStr(`${off} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(byteLength);
  let cursor = 0;
  for (const c of chunks) {
    out.set(c, cursor);
    cursor += c.length;
  }
  return out;
}
