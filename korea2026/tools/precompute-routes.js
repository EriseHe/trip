"use strict";

const statusNode = document.querySelector("#route-cache-status");
const outputNode = document.querySelector("#route-cache-json");
const routeHelpers = window.JapanRouteCache;

function setGeneratorStatus(message) {
  statusNode.textContent = message;
  console.log(message);
}

function setGeneratorResult(result) {
  window.__routeCacheResult = result;
  window.__routeCacheStatus = {
    done: result.done,
    error: result.error || null,
    routeCount: result.data?.routeCount || 0,
  };
}

async function main() {
  try {
    const itineraryText = await readItineraryText();
    const itinerary = JSON.parse(itineraryText);
    const itineraryHash = await sha256Hex(itineraryText);
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("缺少 Google Maps API key");
    }

    await loadGoogleMapsScript(apiKey);
    const { DirectionsService } = await google.maps.importLibrary("routes");
    const directionsService = new DirectionsService();
    const routes = {};
    const failures = [];
    const legs = collectLegs(itinerary);

    for (const [index, leg] of legs.entries()) {
      setGeneratorStatus(`正在计算 ${index + 1}/${legs.length}: ${leg.originStop.title} -> ${leg.destinationStop.title}`);
      const cacheKey = routeHelpers.getRouteCacheKey(
        leg.day,
        leg.originStop,
        leg.destinationStop,
        itinerary.defaultTravelMode,
      );

      try {
        const directions = await requestDirectionsWithRetry(directionsService, itinerary, leg);
        routes[cacheKey] = createRouteCacheEntry(leg, directions);
      } catch (error) {
        failures.push({
          cacheKey,
          fromStopId: leg.originStop.id,
          toStopId: leg.destinationStop.id,
          message: error.message,
        });
        routes[cacheKey] = createFallbackRouteCacheEntry(leg, error.message);
      }

      await sleep(160);
    }

    const approximateCount = Object.values(routes).filter((route) => route.summary?.approximate).length;
    const cache = {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: "korea2026/itinerary.json",
      itineraryHash,
      routeCount: Object.keys(routes).length,
      approximateCount,
      fallbackCount: failures.length,
      failedCount: failures.length,
      failures,
      routes,
    };
    const json = JSON.stringify(cache, null, 2);
    outputNode.textContent = json;
    setGeneratorStatus(
      `完成：${cache.routeCount - approximateCount - cache.failedCount} 段原模式路线，${approximateCount} 段估算路线，${cache.failedCount} 段 fallback。`,
    );
    setGeneratorResult({ done: true, data: cache });
  } catch (error) {
    outputNode.textContent = error.stack || error.message;
    setGeneratorStatus(`失败：${error.message}`);
    setGeneratorResult({ done: true, error: error.message });
  }
}

async function readItineraryText() {
  const response = await fetch("../itinerary.json", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`无法读取 itinerary.json: HTTP ${response.status}`);
  }
  return response.text();
}

function getApiKey() {
  const params = new URLSearchParams(window.location.search);
  return params.get("key") || window.KOREA_MAP_CONFIG?.apiKey || window.JAPAN_MAP_CONFIG?.apiKey || "";
}

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const callbackName = "__koreaRouteCacheGoogleMapsLoaded";
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&v=weekly&loading=async" +
      "&language=zh-CN&region=KR" +
      `&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("无法下载 Google Maps JavaScript API"));
    document.head.appendChild(script);
  });
}

function collectLegs(itinerary) {
  return itinerary.days.flatMap((day) =>
    day.stops
      .slice(0, -1)
      .map((originStop, index) => ({
        day,
        originStop,
        destinationStop: day.stops[index + 1],
        travelMode: routeHelpers.normalizeTravelMode(originStop.travelModeToNext || itinerary.defaultTravelMode),
      }))
      .filter((leg) => !routeHelpers.isRouteCalculationSkipped(leg.originStop, itinerary.defaultTravelMode)),
  );
}

async function requestDirectionsWithRetry(directionsService, itinerary, leg) {
  try {
    return {
      result: await requestDirections(directionsService, itinerary, leg, { usePlannedDeparture: true }),
      travelMode: leg.travelMode,
      estimateSource: "planned-schedule",
    };
  } catch (error) {
    if (!shouldRetryWithCurrentDeparture(error, leg)) {
      throw error;
    }

    console.warn(`${leg.originStop.title} -> ${leg.destinationStop.title} 使用当前时刻表重试`);
    try {
      return {
        result: await requestDirections(directionsService, itinerary, leg, { usePlannedDeparture: false }),
        travelMode: leg.travelMode,
        estimateSource: "current-schedule",
      };
    } catch (retryError) {
      if (!shouldFallbackToDriving(retryError, leg)) {
        throw retryError;
      }

      const drivingLeg = { ...leg, travelMode: "DRIVING" };
      console.warn(`${leg.originStop.title} -> ${leg.destinationStop.title} 使用驾车路线估算`);
      return {
        result: await requestDirections(directionsService, itinerary, drivingLeg, { usePlannedDeparture: false }),
        travelMode: "DRIVING",
        requestedTravelMode: leg.travelMode,
        estimateSource: "driving-fallback",
        approximate: true,
      };
    }
  }
}

function shouldRetryWithCurrentDeparture(error, leg) {
  return leg.travelMode === "TRANSIT" && String(error.message).includes("ZERO_RESULTS");
}

function shouldFallbackToDriving(error, leg) {
  return leg.travelMode === "TRANSIT" && String(error.message).includes("ZERO_RESULTS");
}

function requestDirections(directionsService, itinerary, leg, options) {
  const request = {
    origin: formatDirectionsLocation(leg.originStop, leg.travelMode),
    destination: formatDirectionsLocation(leg.destinationStop, leg.travelMode),
    travelMode: google.maps.TravelMode[leg.travelMode],
    provideRouteAlternatives: false,
  };

  if (!request.origin || !request.destination) {
    return Promise.reject(new Error("缺少坐标，无法计算路线"));
  }
  if (leg.travelMode === "TRANSIT") {
    request.transitOptions = {
      departureTime: getDepartureTime(itinerary, leg, options.usePlannedDeparture),
    };
  }
  if (leg.travelMode === "DRIVING") {
    request.drivingOptions = {
      departureTime: getDepartureTime(itinerary, leg, options.usePlannedDeparture),
      trafficModel: google.maps.TrafficModel.BEST_GUESS,
    };
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("路线计算超时"));
    }, 30000);

    directionsService.route(request, (result, status) => {
      clearTimeout(timer);
      if (status === "OK" && result) {
        resolve(result);
        return;
      }
      reject(new Error(`路线计算失败：${status}`));
    });
  });
}

function formatDirectionsLocation(stop, travelMode) {
  const coords = routeHelpers.getStopCoords(stop);
  if (travelMode === "TRANSIT") {
    return stop.place || stop.address || stop.title || coords;
  }
  return coords || stop.place || stop.address || stop.title;
}

function getDepartureTime(itinerary, leg, usePlannedDeparture) {
  if (usePlannedDeparture) {
    return routeHelpers.getDepartureDate(itinerary, leg.day, leg.originStop);
  }
  return new Date(Date.now() + 10 * 60 * 1000);
}

function createRouteCacheEntry(leg, directions) {
  const { result: directionsResult } = directions;
  const resultLeg = directionsResult.routes?.[0]?.legs?.[0];
  const duration = resultLeg?.duration_in_traffic?.text || resultLeg?.duration?.text || "时间未知";
  const distance = resultLeg?.distance?.text || "距离未知";
  const departure = resultLeg?.departure_time?.text || leg.originStop.time || "";
  const arrival = resultLeg?.arrival_time?.text || "";

  return {
    createdAt: new Date().toISOString(),
    path: getDirectionsPath(directionsResult),
    summary: {
      fromStopId: leg.originStop.id,
      toStopId: leg.destinationStop.id,
      travelMode: directions.travelMode || leg.travelMode,
      requestedTravelMode: directions.requestedTravelMode || leg.travelMode,
      duration,
      distance,
      departure,
      arrival,
      estimateSource: directions.estimateSource,
      approximate: directions.approximate || false,
      note: directions.note || "",
    },
  };
}

function getDirectionsPath(directionsResult) {
  const overviewPath = directionsResult.routes?.[0]?.overview_path || [];
  return overviewPath
    .map((point) => ({ lat: point.lat(), lng: point.lng() }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function createFallbackRouteCacheEntry(leg, errorMessage) {
  return {
    createdAt: new Date().toISOString(),
    path: [routeHelpers.getStopCoords(leg.originStop), routeHelpers.getStopCoords(leg.destinationStop)].filter(Boolean),
    summary: {
      fromStopId: leg.originStop.id,
      toStopId: leg.destinationStop.id,
      travelMode: leg.travelMode,
      duration: "未找到路线",
      distance: "已显示直线",
      fallback: true,
      note: routeHelpers.friendlyDirectionsError(errorMessage),
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

setGeneratorResult({ done: false });
void main();
