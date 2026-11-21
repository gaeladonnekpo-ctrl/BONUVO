export type PosterAspectRatio = "1:1" | "4:5" | "9:16" | "16:9";
export type PosterExportFormat = "png" | "jpeg" | "webp" | "pdf";

export interface PosterDimensionsSpec {
  id: PosterAspectRatio;
  width: number;
  height: number;
  labelFr: string;
  labelEn: string;
  usageFr: string;
  usageEn: string;
}

export const POSTER_DIMENSIONS: Record<PosterAspectRatio, PosterDimensionsSpec> = {
  "1:1": {
    id: "1:1",
    width: 1080,
    height: 1080,
    labelFr: "Carré (1:1)",
    labelEn: "Square (1:1)",
    usageFr: "Instagram, Facebook, WhatsApp",
    usageEn: "Instagram, Facebook, WhatsApp",
  },
  "4:5": {
    id: "4:5",
    width: 1080,
    height: 1350,
    labelFr: "Portrait (4:5)",
    labelEn: "Portrait (4:5)",
    usageFr: "Feed Instagram & Facebook",
    usageEn: "Instagram & Facebook Feed",
  },
  "9:16": {
    id: "9:16",
    width: 1080,
    height: 1920,
    labelFr: "Story / Vertical (9:16)",
    labelEn: "Story / Vertical (9:16)",
    usageFr: "Stories, TikTok, Statuts WhatsApp",
    usageEn: "Stories, TikTok, WhatsApp Status",
  },
  "16:9": {
    id: "16:9",
    width: 1920,
    height: 1080,
    labelFr: "Paysage (16:9)",
    labelEn: "Landscape (16:9)",
    usageFr: "YouTube, X/Twitter, Bannières",
    usageEn: "YouTube, X/Twitter, Banners",
  },
};

export interface PosterLayoutPlan {
  columns: 1 | 2;
  headerHeight: number;
  footerHeight: number;
  paddingX: number;
  gap: number;
  rowHeight: number;
  teamFontSize: number;
  logoSize: number;
  recommendedRatio: PosterAspectRatio | null;
}

/**
 * Computes an adaptive grid/list layout so that EVERY match of a competition
 * on a given day fits cleanly onto a single poster image without truncation.
 */
export function computePosterLayout(params: {
  ratio: PosterAspectRatio;
  matchCount: number;
}): PosterLayoutPlan {
  const spec = POSTER_DIMENSIONS[params.ratio];
  const count = Math.max(1, params.matchCount);

  const isLandscape = params.ratio === "16:9";
  const columns: 1 | 2 = isLandscape && count >= 2 ? 2 : !isLandscape && count >= 7 ? 2 : 1;

  const paddingX = isLandscape ? 64 : 52;
  const headerHeight = isLandscape ? 230 : params.ratio === "1:1" ? 245 : 275;
  const footerHeight = 96;
  const availableHeight = spec.height - headerHeight - footerHeight - 28;
  const rows = Math.ceil(count / columns);
  const gap = rows >= 7 ? 10 : rows >= 5 ? 14 : 18;
  const maxRowHeight = columns === 2 ? 128 : 138;
  const computedRowHeight = Math.floor((availableHeight - gap * Math.max(0, rows - 1)) / rows);
  const rowHeight = Math.max(58, Math.min(maxRowHeight, computedRowHeight));

  const teamFontSize = rowHeight >= 104 ? 22 : rowHeight >= 84 ? 19 : rowHeight >= 70 ? 17 : 15;
  const logoSize = rowHeight >= 104 ? 46 : rowHeight >= 84 ? 40 : rowHeight >= 70 ? 34 : 28;

  let recommendedRatio: PosterAspectRatio | null = null;
  if (params.ratio === "1:1" && count >= 9) {
    recommendedRatio = "9:16";
  } else if (params.ratio === "4:5" && count >= 12) {
    recommendedRatio = "9:16";
  }

  return {
    columns,
    headerHeight,
    footerHeight,
    paddingX,
    gap,
    rowHeight,
    teamFontSize,
    logoSize,
    recommendedRatio,
  };
}
