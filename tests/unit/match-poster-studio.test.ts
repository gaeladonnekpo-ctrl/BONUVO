import { describe, expect, it } from "vitest";
import { buildPdfFromJpegBytes } from "@/lib/media/image-to-pdf";
import { computePosterLayout, POSTER_DIMENSIONS } from "@/modules/ai/model/match-poster-layout";

describe("Match Poster Layout & Export", () => {
  it("keeps 1 column for small slates (2-3 matches) and adapts cleanly for 10+ matches", () => {
    const small = computePosterLayout({ ratio: "4:5", matchCount: 3 });
    expect(small.columns).toBe(1);
    expect(small.rowHeight).toBeGreaterThanOrEqual(110);
    expect(small.recommendedRatio).toBeNull();

    const large = computePosterLayout({ ratio: "1:1", matchCount: 12 });
    expect(large.columns).toBe(2);
    expect(large.rowHeight).toBeGreaterThanOrEqual(58);
    expect(large.teamFontSize).toBeGreaterThanOrEqual(15);
    expect(large.recommendedRatio).toBe("9:16");

    const wide = computePosterLayout({ ratio: "16:9", matchCount: 10 });
    expect(wide.columns).toBe(2);
    expect(wide.recommendedRatio).toBeNull();
  });

  it("supports all 4 social aspect ratios with high-resolution dimensions", () => {
    expect(POSTER_DIMENSIONS["1:1"]).toMatchObject({ width: 1080, height: 1080 });
    expect(POSTER_DIMENSIONS["4:5"]).toMatchObject({ width: 1080, height: 1350 });
    expect(POSTER_DIMENSIONS["9:16"]).toMatchObject({ width: 1080, height: 1920 });
    expect(POSTER_DIMENSIONS["16:9"]).toMatchObject({ width: 1920, height: 1080 });
  });

  it("wraps JPEG bytes into a valid single-page PDF 1.4 document", () => {
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);
    const pdf = buildPdfFromJpegBytes(fakeJpeg, 1080, 1350);
    const header = new TextDecoder().decode(pdf.slice(0, 8));
    const tail = new TextDecoder().decode(pdf.slice(-10));

    expect(header).toBe("%PDF-1.4");
    expect(tail).toContain("%%EOF");
  });
});
