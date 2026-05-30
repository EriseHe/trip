import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../..");
const manifestPath = path.join(repoRoot, "trips.json");
const port = Number(process.env.ROUTE_CACHE_PORT || 5173);
const timeoutMs = Number(process.env.ROUTE_CACHE_TIMEOUT_MS || 180000);
const requestedTripIds = process.argv.slice(2);
const trips = selectTrips(await loadTrips(), requestedTripIds);

if (trips.length === 0) {
  throw new Error("No trips selected for route cache generation.");
}

const server = await startStaticServer(repoRoot, port);
const browser = await chromium.launch(getLaunchOptions());

try {
  const page = await browser.newPage();
  page.on("console", (message) => console.log(`[browser] ${message.text()}`));
  page.on("pageerror", (error) => console.error(`[browser error] ${error.message}`));

  for (const trip of trips) {
    await generateTripCache(page, trip);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

async function loadTrips() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.trips)) {
    throw new Error("trips.json must contain a trips array.");
  }

  return manifest.trips.map((trip) => {
    const id = String(trip.id || "").trim();
    validateTripId(id);
    return { ...trip, id };
  });
}

function selectTrips(allTrips, tripIds) {
  if (tripIds.length === 0) return allTrips;

  const tripsById = new Map(allTrips.map((trip) => [trip.id, trip]));
  return tripIds.map((tripId) => {
    validateTripId(tripId);
    const trip = tripsById.get(tripId);
    if (!trip) {
      throw new Error(`Unknown trip id: ${tripId}`);
    }
    return trip;
  });
}

async function generateTripCache(page, trip) {
  const outputPath = path.join(repoRoot, trip.id, "route-cache.json");
  await mkdir(path.dirname(outputPath), { recursive: true });

  console.log(`Generating route cache for ${trip.id}...`);
  await page.goto(buildGeneratorUrl(trip.id), { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__routeCacheResult?.done === true, null, { timeout: timeoutMs });
  const result = await page.evaluate(() => window.__routeCacheResult);

  if (result.error) {
    throw new Error(`${trip.id}: ${result.error}`);
  }

  await writeFile(outputPath, `${JSON.stringify(result.data, null, 2)}\n`);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)} with ${result.data.routeCount} route entries.`);
}

function buildGeneratorUrl(tripId) {
  const generatorUrl = new URL(`http://localhost:${port}/shared/tools/precompute-routes.html`);
  generatorUrl.searchParams.set("trip", tripId);
  if (process.env.GOOGLE_MAPS_API_KEY) {
    generatorUrl.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY);
  }
  return generatorUrl.toString();
}

function validateTripId(tripId) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(tripId)) {
    throw new Error(`Invalid trip id: ${tripId || "(empty)"}`);
  }
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

      if (resolvedPath !== root && !resolvedPath.startsWith(`${root}${path.sep}`)) {
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
    server.listen(listenPort, "127.0.0.1", () => {
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
