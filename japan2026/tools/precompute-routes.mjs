import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../..");
const outputPath = path.join(repoRoot, "japan2026", "route-cache.json");
const port = Number(process.env.ROUTE_CACHE_PORT || 5173);
const url = buildGeneratorUrl();

const server = await startStaticServer(repoRoot, port);
const browser = await chromium.launch(getLaunchOptions());

try {
  const page = await browser.newPage();
  page.on("console", (message) => console.log(`[browser] ${message.text()}`));
  page.on("pageerror", (error) => console.error(`[browser error] ${error.message}`));

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__routeCacheResult?.done === true, null, { timeout: 180000 });
  const result = await page.evaluate(() => window.__routeCacheResult);

  if (result.error) {
    throw new Error(result.error);
  }

  await writeFile(outputPath, `${JSON.stringify(result.data, null, 2)}\n`);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} with ${result.data.routeCount} route entries.`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function buildGeneratorUrl() {
  const generatorUrl = new URL(`http://localhost:${port}/japan2026/tools/precompute-routes.html`);
  if (process.env.GOOGLE_MAPS_API_KEY) {
    generatorUrl.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY);
  }
  return generatorUrl.toString();
}

function getLaunchOptions() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const options = { headless: true };
  if (process.platform === "darwin" && existsSync(chromePath)) {
    options.executablePath = chromePath;
  }
  return options;
}

function startStaticServer(root, listenPort) {
  const server = createServer(async (request, response) => {
    try {
      const requestedPath = decodeURIComponent(new URL(request.url || "/", `http://localhost:${listenPort}`).pathname);
      const filePath = path.join(root, requestedPath === "/" ? "index.html" : requestedPath);
      const resolvedPath = path.resolve(filePath);

      if (!resolvedPath.startsWith(root)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const fileStat = await stat(resolvedPath);
      if (!fileStat.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "Content-Type": contentTypeFor(resolvedPath) });
      createReadStream(resolvedPath).pipe(response);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(listenPort, "127.0.0.1", async () => {
      await mkdir(path.dirname(outputPath), { recursive: true });
      resolve(server);
    });
  });
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath);
  const types = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };
  return types[extension] || "application/octet-stream";
}
