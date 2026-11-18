import { execSync } from "node:child_process";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopPort3000() {
  try {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore" },
    );
  } catch {
    // Ignore when no process is listening on port 3000
  }
}

function startWmiServer() {
  const cwd = process.cwd();
  const psCommand = `Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = 'cmd /c cd /d "${cwd}" && npx next start --port ${PORT} > "${cwd}\\next-server.log" 2>&1' } | Out-Null`;
  execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: "ignore" });
}

async function warmPublicRoutes() {
  const routes = [
    "/fr",
    "/en",
    "/fr/offres",
    "/fr/codes-promo",
    "/fr/bookmakers",
    "/fr/communaute",
    "/en/communaute",
  ];
  for (const route of routes) {
    try {
      await fetch(`${BASE_URL}${route}`, { cache: "no-store" });
    } catch {
      // Best-effort warmup
    }
  }
}

async function verifyServerAndCss() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const res = await fetch(`${BASE_URL}/fr/pronostics`, { cache: "no-store" });
      if (!res.ok) {
        await sleep(750);
        continue;
      }
      const html = await res.text();
      const cssMatches = Array.from(new Set(html.match(/\/_next\/static\/[^"'>\s]+\.css/g) ?? []));
      if (cssMatches.length === 0) {
        await sleep(750);
        continue;
      }

      let allCssOk = true;
      for (const cssPath of cssMatches) {
        const cssRes = await fetch(`${BASE_URL}${cssPath}`, { cache: "no-store" });
        if (!cssRes.ok) {
          allCssOk = false;
          break;
        }
        const cssText = await cssRes.text();
        if (cssText.length < 500) {
          allCssOk = false;
          break;
        }
      }

      if (allCssOk) {
        await warmPublicRoutes();
        console.log(
          `[bonuvo-css-guard] Serveur :${PORT} prêt et préchauffé — ${cssMatches.length} fichier(s) CSS vérifiés (200 OK).`,
        );
        return true;
      }
    } catch {
      // Server still booting
    }
    await sleep(750);
  }
  return false;
}

async function main() {
  if (
    Boolean(process.env.CI) ||
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    process.env.SKIP_POSTBUILD_SERVER === "1" ||
    process.platform !== "win32"
  ) {
    console.log("[bonuvo-css-guard] Environnement Cloud/CI détecté — redémarrage local ignoré.");
    return;
  }

  stopPort3000();
  await sleep(1200);
  startWmiServer();

  const ok = await verifyServerAndCss();
  if (!ok) {
    console.error("[bonuvo-css-guard] Échec de vérification CSS au premier essai, relance...");
    stopPort3000();
    await sleep(1200);
    startWmiServer();
    const retryOk = await verifyServerAndCss();
    if (!retryOk) {
      console.error("[bonuvo-css-guard] Impossible de vérifier les feuilles CSS sur le port 3000.");
      process.exit(1);
    }
  }
}

main();
