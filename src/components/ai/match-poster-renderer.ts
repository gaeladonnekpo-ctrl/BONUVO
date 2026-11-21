import { buildPdfFromJpegBytes } from "@/lib/media/image-to-pdf";
import {
  computePosterLayout,
  POSTER_DIMENSIONS,
  type PosterAspectRatio,
  type PosterExportFormat,
} from "@/modules/ai/model/match-poster-layout";
import type { LeagueFilterOption, PublicFixtureDto } from "@/modules/ai/service/public-ai-types";

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawBonuvoWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number) {
  ctx.save();
  ctx.font = `800 ${fontSize}px "Unbounded", "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8fafc";

  const gap = fontSize * 0.08;
  const markSize = fontSize * 0.74;
  let cursor = x;

  ctx.fillText("B", cursor, y);
  cursor += ctx.measureText("B").width + gap;

  // Ring O
  const ringR = markSize / 2;
  const cy = y - fontSize * 0.36;
  ctx.beginPath();
  ctx.arc(cursor + ringR, cy, ringR * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(3, markSize * 0.21);
  ctx.strokeStyle = "#f8fafc";
  ctx.stroke();
  cursor += markSize + gap;

  ctx.fillText("NUV", cursor, y);
  cursor += ctx.measureText("NUV").width + gap;

  // Target O
  const targetCx = cursor + ringR;
  ctx.beginPath();
  ctx.arc(targetCx, cy, ringR * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(3, markSize * 0.21);
  ctx.strokeStyle = "#ff7a1a";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(targetCx, cy, ringR * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#ff7a1a";
  ctx.fill();
  ctx.restore();
}

async function loadProxiedImage(url: string): Promise<HTMLImageElement | null> {
  if (!url || !url.startsWith("https://")) return null;
  const proxied = `/api/ai/asset-proxy?url=${encodeURIComponent(url)}`;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => resolve(null), 6500);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = proxied;
  });
}

function drawTeamLogoOrMonogram(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  name: string,
  cx: number,
  cy: number,
  size: number,
) {
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#1a2642";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#3b507a";
  ctx.stroke();

  if (img && img.naturalWidth > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();
    const pad = size * 0.14;
    const avail = size - pad * 2;
    const ratio = Math.min(avail / img.naturalWidth, avail / img.naturalHeight);
    const dw = img.naturalWidth * ratio;
    const dh = img.naturalHeight * ratio;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = "#ff7a1a";
    ctx.font = `700 ${Math.max(10, Math.round(size * 0.34))}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name.slice(0, 3).toUpperCase(), cx, cy + 1);
  }
  ctx.restore();
}

function fitTextEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 2 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

function formatReadablePosterDate(dateIso: string, isEn: boolean): string {
  const [y, m, d] = dateIso.split("-").map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
  return new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

export async function renderMatchPosterToCanvas(
  canvas: HTMLCanvasElement,
  params: {
    dateIso: string;
    league: LeagueFilterOption;
    fixtures: PublicFixtureDto[];
    ratio: PosterAspectRatio;
    siteUrl?: string;
    locale?: string;
  },
) {
  const isEn = params.locale === "en";
  const spec = POSTER_DIMENSIONS[params.ratio];
  const layout = computePosterLayout({
    ratio: params.ratio,
    matchCount: params.fixtures.length,
  });

  canvas.width = spec.width;
  canvas.height = spec.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CANVAS_2D_UNAVAILABLE");

  // Load league logo + all team logos in parallel via CORS-safe proxy
  const uniqueUrls = Array.from(
    new Set(
      [
        params.league.logoUrl,
        ...params.fixtures.flatMap((f) => [f.homeTeamLogo, f.awayTeamLogo]),
      ].filter((u): u is string => Boolean(u && u.startsWith("https://"))),
    ),
  );
  const loadedEntries = await Promise.all(
    uniqueUrls.map(async (u) => [u, await loadProxiedImage(u)] as const),
  );
  const imageMap = new Map<string, HTMLImageElement | null>(loadedEntries);

  // 1. Background (BONUVO Dark Navy + Accent/Trust Glows + Subtle Grid)
  const bgGrad = ctx.createLinearGradient(0, 0, spec.width, spec.height);
  bgGrad.addColorStop(0, "#0b1120");
  bgGrad.addColorStop(0.55, "#101a32");
  bgGrad.addColorStop(1, "#0b1120");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, spec.width, spec.height);

  const glowTop = ctx.createRadialGradient(
    spec.width * 0.85,
    spec.height * 0.1,
    10,
    spec.width * 0.85,
    spec.height * 0.1,
    spec.width * 0.55,
  );
  glowTop.addColorStop(0, "rgba(255, 122, 26, 0.22)");
  glowTop.addColorStop(1, "rgba(255, 122, 26, 0)");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, spec.width, spec.height);

  const glowBot = ctx.createRadialGradient(
    spec.width * 0.12,
    spec.height * 0.88,
    10,
    spec.width * 0.12,
    spec.height * 0.88,
    spec.width * 0.5,
  );
  glowBot.addColorStop(0, "rgba(46, 224, 138, 0.16)");
  glowBot.addColorStop(1, "rgba(46, 224, 138, 0)");
  ctx.fillStyle = glowBot;
  ctx.fillRect(0, 0, spec.width, spec.height);

  ctx.save();
  ctx.strokeStyle = "rgba(59, 80, 122, 0.12)";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < spec.width; gx += 64) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, spec.height);
    ctx.stroke();
  }
  for (let gy = 0; gy < spec.height; gy += 64) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(spec.width, gy);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Header: BONUVO Wordmark + Date Pill + Competition Title & Official Logo
  const px = layout.paddingX;
  drawBonuvoWordmark(ctx, px, 76, 40);

  // Date pill on top right
  const dateLabel = formatReadablePosterDate(params.dateIso, isEn).toUpperCase();
  ctx.save();
  ctx.font = '700 18px "Plus Jakarta Sans", system-ui, sans-serif';
  const dateW = Math.min(spec.width * 0.5, ctx.measureText(dateLabel).width + 40);
  const pillX = spec.width - px - dateW;
  drawRoundedRect(ctx, pillX, 40, dateW, 44, 22);
  ctx.fillStyle = "rgba(255, 122, 26, 0.16)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 122, 26, 0.55)";
  ctx.stroke();
  ctx.fillStyle = "#ff8e3d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(fitTextEllipsis(ctx, dateLabel, dateW - 24), pillX + dateW / 2, 62);
  ctx.restore();

  // Competition Banner
  const leagueY = 122;
  const leagueLogo = params.league.logoUrl ? (imageMap.get(params.league.logoUrl) ?? null) : null;
  drawTeamLogoOrMonogram(ctx, leagueLogo, params.league.name, px + 36, leagueY + 38, 72);

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#2ee08a";
  ctx.font = '700 18px "Plus Jakarta Sans", system-ui, sans-serif';
  const subTitle = `${params.league.countryName.toUpperCase()} · ${params.fixtures.length} ${
    params.fixtures.length > 1 ? (isEn ? "MATCHES" : "MATCHS") : isEn ? "MATCH" : "MATCH"
  }`;
  ctx.fillText(subTitle, px + 92, leagueY + 24);

  ctx.fillStyle = "#f8fafc";
  ctx.font = `800 ${params.ratio === "16:9" ? 42 : 36}px "Unbounded", "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.fillText(
    fitTextEllipsis(ctx, params.league.name, spec.width - px * 2 - 104),
    px + 92,
    leagueY + 66,
  );
  ctx.restore();

  // Divider line
  const dividerY = layout.headerHeight - 16;
  const divGrad = ctx.createLinearGradient(px, dividerY, spec.width - px, dividerY);
  divGrad.addColorStop(0, "#ff7a1a");
  divGrad.addColorStop(0.5, "#2ee08a");
  divGrad.addColorStop(1, "rgba(59, 80, 122, 0.2)");
  ctx.fillStyle = divGrad;
  ctx.fillRect(px, dividerY, spec.width - px * 2, 2.5);

  // 3. Match Rows (1 or 2 columns, all fixtures displayed on one single image)
  const contentW = spec.width - px * 2;
  const colGap = 20;
  const colW = layout.columns === 2 ? (contentW - colGap) / 2 : contentW;
  const startY = layout.headerHeight + 6;

  params.fixtures.forEach((fix, index) => {
    const col = layout.columns === 2 ? index % 2 : 0;
    const row = layout.columns === 2 ? Math.floor(index / 2) : index;
    const cardX = px + col * (colW + colGap);
    const cardY = startY + row * (layout.rowHeight + layout.gap);

    // Match Card
    drawRoundedRect(ctx, cardX, cardY, colW, layout.rowHeight, 16);
    ctx.fillStyle = "rgba(19, 28, 49, 0.92)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#263554";
    ctx.stroke();

    const midY = cardY + layout.rowHeight / 2;
    const logoR = layout.logoSize / 2;
    const innerPad = 16;

    const homeImg = fix.homeTeamLogo ? (imageMap.get(fix.homeTeamLogo) ?? null) : null;
    const awayImg = fix.awayTeamLogo ? (imageMap.get(fix.awayTeamLogo) ?? null) : null;

    // Home Logo
    drawTeamLogoOrMonogram(
      ctx,
      homeImg,
      fix.homeTeamName,
      cardX + innerPad + logoR,
      midY,
      layout.logoSize,
    );

    // Away Logo
    drawTeamLogoOrMonogram(
      ctx,
      awayImg,
      fix.awayTeamName,
      cardX + colW - innerPad - logoR,
      midY,
      layout.logoSize,
    );

    // Center Badge (Kickoff Time or Score)
    const centerBoxW = layout.rowHeight >= 80 ? 116 : 96;
    const centerBoxH = layout.rowHeight >= 80 ? 44 : 36;
    const centerX = cardX + colW / 2 - centerBoxW / 2;
    const centerY = midY - centerBoxH / 2;

    const hasScore =
      (fix.fixtureStatus === "finished" || fix.fixtureStatus === "live") &&
      fix.homeGoals !== null &&
      fix.awayGoals !== null;
    const centerText = hasScore
      ? `${fix.homeGoals} - ${fix.awayGoals}`
      : new Intl.DateTimeFormat(isEn ? "en-GB" : "fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(fix.kickoffAt));

    drawRoundedRect(ctx, centerX, centerY, centerBoxW, centerBoxH, 10);
    ctx.fillStyle = hasScore ? "rgba(46, 224, 138, 0.16)" : "#0b1120";
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = hasScore ? "rgba(46, 224, 138, 0.5)" : "#3b507a";
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = hasScore ? "#2ee08a" : "#ff8e3d";
    ctx.font = `700 ${layout.rowHeight >= 80 ? 18 : 15}px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(centerText, cardX + colW / 2, midY + 1);
    ctx.restore();

    // Team Names
    const textAvail = colW / 2 - centerBoxW / 2 - innerPad - layout.logoSize - 18;
    ctx.save();
    ctx.fillStyle = "#f8fafc";
    ctx.font = `700 ${layout.teamFontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillText(
      fitTextEllipsis(ctx, fix.homeTeamName, Math.max(60, textAvail)),
      cardX + innerPad + layout.logoSize + 12,
      midY + 1,
    );

    ctx.textAlign = "right";
    ctx.fillText(
      fitTextEllipsis(ctx, fix.awayTeamName, Math.max(60, textAvail)),
      cardX + colW - innerPad - layout.logoSize - 12,
      midY + 1,
    );
    ctx.restore();
  });

  // 4. Mandatory Footer Bar with BONUVO Website URL
  const footerY = spec.height - layout.footerHeight;
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.fillRect(0, footerY, spec.width, layout.footerHeight);
  ctx.fillStyle = "#263554";
  ctx.fillRect(0, footerY, spec.width, 1.5);

  const displayUrl = params.siteUrl ?? "https://www.bonuvofr.com";
  ctx.save();
  // 18+ badge
  drawRoundedRect(ctx, px, footerY + 28, 52, 36, 8);
  ctx.fillStyle = "#131c31";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#3b507a";
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.font = '700 17px "JetBrains Mono", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("18+", px + 26, footerY + 47);

  ctx.fillStyle = "#94a3b8";
  ctx.font = '500 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = "left";
  ctx.fillText(
    isEn ? "BONUVO AI · Responsible gambling" : "BONUVO AI · Jeu responsable",
    px + 68,
    footerY + 47,
  );

  ctx.fillStyle = "#ff7a1a";
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.textAlign = "right";
  ctx.fillText(displayUrl.replace(/^https?:\/\//, ""), spec.width - px, footerY + 47);
  ctx.restore();
}

export async function exportPosterFromCanvas(
  canvas: HTMLCanvasElement,
  params: {
    format: PosterExportFormat;
    filenameBase: string;
  },
): Promise<void> {
  const safeBase = params.filenameBase.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  let blob: Blob;
  let ext: string = params.format;

  if (params.format === "pdf") {
    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("JPEG_ENCODE_FAILED"))),
        "image/jpeg",
        0.94,
      );
    });
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    const pdfBytes = buildPdfFromJpegBytes(jpegBytes, canvas.width, canvas.height);
    const pdfBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;
    blob = new Blob([pdfBuffer], { type: "application/pdf" });
  } else {
    const mime =
      params.format === "jpeg"
        ? "image/jpeg"
        : params.format === "webp"
          ? "image/webp"
          : "image/png";
    ext = params.format === "jpeg" ? "jpg" : params.format;
    blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("IMAGE_ENCODE_FAILED"))), mime, 0.95);
    });
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${safeBase}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
