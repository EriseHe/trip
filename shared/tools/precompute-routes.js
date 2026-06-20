"use strict";

const statusNode = document.querySelector("#route-cache-status");
const outputNode = document.querySelector("#route-cache-json");
const routeHelpers = window.TripRouteCache;
const routeParams = new URLSearchParams(window.location.search);
const GROUPED_ROUTE_MODES = new Set(["DRIVING", "WALKING"]);
const MAX_DIRECTIONS_WAYPOINTS = 25;

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
    if (!routeHelpers) {
      throw new Error("缺少 shared route-cache helper");
    }

    const tripId = getTripId();
    await loadTripConfig(tripId);

    const itineraryText = await readItineraryText(tripId);
    const itinerary = applyTripDefaults(JSON.parse(itineraryText));
    const itineraryHash = await sha256Hex(itineraryText);

    const routes = {};
    const failures = [];
    const routeBatches = collectRouteBatches(itinerary);
    const requestableBatches = routeBatches.filter((batch) => !isRouteModeUnavailable(batch.travelMode));
    let directionsService = null;
    let requestCount = 0;
    let approximateCount = 0;

    if (requestableBatches.length) {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("缺少 Google Maps API key");
      }
      await loadGoogleMapsScript(tripId, apiKey);
      const { DirectionsService } = await google.maps.importLibrary("routes");
      directionsService = new DirectionsService();
    }

    for (const [index, batch] of routeBatches.entries()) {
      setGeneratorStatus(`正在计算 ${tripId} ${index + 1}/${routeBatches.length}: ${describeRouteBatch(batch)}`);

      if (isRouteModeUnavailable(batch.travelMode)) {
        Object.assign(routes, createEstimatedRouteCacheEntries(batch, itinerary));
        approximateCount += batch.legs.length;
        continue;
      }

      try {
        requestCount += 1;
        const directions = await requestDirectionsOnce(directionsService, itinerary, batch);
        Object.assign(routes, createRouteCacheEntries(batch, directions, itinerary));
      } catch (error) {
        for (const leg of batch.legs) {
          const cacheKey = getRouteCacheKey(leg, itinerary);
          failures.push({
            cacheKey,
            fromStopId: leg.originStop.id,
            toStopId: leg.destinationStop.id,
            message: error.message,
          });
          routes[cacheKey] = createFallbackRouteCacheEntry(leg, error.message);
        }
      }

      await sleep(160);
    }

    const cache = {
      version: 1,
      generatedAt: new Date().toISOString(),
      source: `${tripId}/itinerary.json`,
      itineraryHash,
      routeCount: Object.keys(routes).length,
      requestCount,
      approximateCount,
      fallbackCount: failures.length,
      failedCount: failures.length,
      failures,
      routes,
    };
    const json = JSON.stringify(cache, null, 2);
    outputNode.textContent = json;
    setGeneratorStatus(
      `完成：${cache.requestCount} 次请求，${cache.routeCount - cache.failedCount - cache.approximateCount} 段路线，${cache.approximateCount} 段估算，${cache.failedCount} 段 fallback。`,
    );
    setGeneratorResult({ done: true, data: cache });
  } catch (error) {
    outputNode.textContent = error.stack || error.message;
    setGeneratorStatus(`失败：${error.message}`);
    setGeneratorResult({ done: true, error: error.message });
  }
}

function getTripId() {
  const tripId = routeParams.get("trip") || "";
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(tripId)) {
    throw new Error("URL 必须包含合法的 ?trip=trip-id");
  }
  return tripId;
}

function loadTripConfig(tripId) {
  if (window.TRIP_PLANNER_CONFIG?.id === tripId) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `/${tripId}/trip-config.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`无法读取 ${tripId}/trip-config.js`));
    document.head.appendChild(script);
  });
}

async function readItineraryText(tripId) {
  const response = await fetch(`/${tripId}/itinerary.json`, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`无法读取 ${tripId}/itinerary.json: HTTP ${response.status}`);
  }
  return response.text();
}

function getApiKey() {
  return (
    routeParams.get("key") ||
    window.TRIP_PLANNER_CONFIG?.map?.apiKey ||
    window.TRIP_SITE_CONFIG?.googleMapsApiKey ||
    ""
  );
}

function applyTripDefaults(itinerary) {
  const config = window.TRIP_PLANNER_CONFIG || {};
  return {
    ...itinerary,
    timezone: itinerary.timezone || config.timezone,
    timezoneOffset: itinerary.timezoneOffset || config.timezoneOffset,
    defaultTravelMode: itinerary.defaultTravelMode || "DRIVING",
  };
}

function loadGoogleMapsScript(tripId, apiKey) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__routeCacheGoogleMapsLoaded_${tripId.replace(/\W/g, "_")}`;
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };

    const config = window.TRIP_PLANNER_CONFIG || {};
    const language = config.map?.language || window.TRIP_SITE_CONFIG?.mapLanguage || "zh-CN";
    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&v=weekly&loading=async" +
      `&language=${encodeURIComponent(language)}` +
      `${config.map?.region ? `&region=${encodeURIComponent(config.map.region)}` : ""}` +
      `&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("无法下载 Google Maps JavaScript API"));
    document.head.appendChild(script);
  });
}

function collectRouteBatches(itinerary) {
  const batches = [];

  for (const day of itinerary.days) {
    let currentBatch = null;

    for (let index = 0; index < day.stops.length - 1; index += 1) {
      const originStop = day.stops[index];
      const destinationStop = day.stops[index + 1];
      const leg = {
        day,
        originStop,
        destinationStop,
        travelMode: routeHelpers.normalizeTravelMode(originStop.travelModeToNext || itinerary.defaultTravelMode),
      };

      if (routeHelpers.isRouteCalculationSkipped(originStop, itinerary.defaultTravelMode)) {
        currentBatch = flushRouteBatch(batches, currentBatch);
        continue;
      }

      if (!canGroupRouteMode(leg.travelMode)) {
        currentBatch = flushRouteBatch(batches, currentBatch);
        batches.push(createRouteBatch(leg));
        continue;
      }

      if (canAddLegToRouteBatch(currentBatch, leg)) {
        currentBatch.legs.push(leg);
        currentBatch.destinationStop = leg.destinationStop;
      } else {
        currentBatch = flushRouteBatch(batches, currentBatch);
        currentBatch = createRouteBatch(leg);
      }
    }

    flushRouteBatch(batches, currentBatch);
  }

  return batches;
}

function createRouteBatch(leg) {
  return {
    day: leg.day,
    originStop: leg.originStop,
    destinationStop: leg.destinationStop,
    travelMode: leg.travelMode,
    legs: [leg],
  };
}

function flushRouteBatch(batches, batch) {
  if (batch) {
    batches.push(batch);
  }
  return null;
}

function canGroupRouteMode(travelMode) {
  return GROUPED_ROUTE_MODES.has(travelMode);
}

function canAddLegToRouteBatch(batch, leg) {
  if (!batch) return false;
  if (batch.day.id !== leg.day.id) return false;
  if (batch.travelMode !== leg.travelMode) return false;
  return batch.legs.length < MAX_DIRECTIONS_WAYPOINTS + 1;
}

function describeRouteBatch(batch) {
  const modeLabel = batch.travelMode.toLowerCase();
  const segmentText = batch.legs.length === 1 ? "1 segment" : `${batch.legs.length} segments`;
  return `${batch.originStop.title} -> ${batch.destinationStop.title} (${modeLabel}, ${segmentText})`;
}

function isRouteModeUnavailable(travelMode) {
  const unavailableModes = window.TRIP_PLANNER_CONFIG?.routing?.unavailableModes || [];
  return unavailableModes.map(routeHelpers.normalizeTravelMode).includes(travelMode);
}

function createEstimatedRouteCacheEntries(batch, itinerary) {
  const profile = window.TRIP_PLANNER_CONFIG?.routing?.estimateProfiles?.[batch.travelMode] || {};
  return Object.fromEntries(
    batch.legs.map((leg) => {
      const estimate = routeHelpers.estimateRouteBetweenStops(
        leg.originStop,
        leg.destinationStop,
        leg.travelMode,
        profile,
      );
      if (!estimate) {
        throw new Error(`缺少坐标，无法估算 ${leg.originStop.id} -> ${leg.destinationStop.id}`);
      }
      return [getRouteCacheKey(leg, itinerary), createEstimatedRouteCacheEntry(leg, estimate)];
    }),
  );
}

function createEstimatedRouteCacheEntry(leg, estimate) {
  return {
    createdAt: new Date().toISOString(),
    path: estimate.path,
    summary: {
      fromStopId: leg.originStop.id,
      toStopId: leg.destinationStop.id,
      travelMode: leg.travelMode,
      requestedTravelMode: leg.travelMode,
      duration: estimate.duration,
      distance: estimate.distance,
      approximate: true,
      estimateSource: "straight-line",
    },
  };
}

async function requestDirectionsOnce(directionsService, itinerary, batch) {
  return {
    result: await requestDirections(directionsService, itinerary, batch, { usePlannedDeparture: true }),
    travelMode: batch.travelMode,
    estimateSource: "planned-schedule",
  };
}

function requestDirections(directionsService, itinerary, batch, options) {
  const request = {
    origin: formatDirectionsLocation(batch.originStop, batch.travelMode),
    destination: formatDirectionsLocation(batch.destinationStop, batch.travelMode),
    travelMode: google.maps.TravelMode[batch.travelMode],
    provideRouteAlternatives: false,
  };
  const waypoints = getRouteBatchWaypoints(batch);
  if (waypoints.length) {
    if (waypoints.some((waypoint) => !waypoint.location)) {
      return Promise.reject(new Error("缺少 waypoint 坐标，无法计算合并路线"));
    }
    request.waypoints = waypoints;
  }

  if (!request.origin || !request.destination) {
    return Promise.reject(new Error("缺少坐标，无法计算路线"));
  }
  if (batch.travelMode === "TRANSIT") {
    request.transitOptions = {
      departureTime: getDepartureTime(itinerary, batch.legs[0], options.usePlannedDeparture),
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

function getRouteBatchWaypoints(batch) {
  return batch.legs.slice(0, -1).map((leg) => ({
    location: formatDirectionsLocation(leg.destinationStop, batch.travelMode),
    stopover: true,
  }));
}

function formatDirectionsLocation(stop, travelMode) {
  const coords = routeHelpers.getStopCoords(stop);
  return coords || stop.mapsQuery || stop.address || stop.place || stop.title;
}

function getDepartureTime(itinerary, leg, usePlannedDeparture) {
  if (usePlannedDeparture) {
    return routeHelpers.getDepartureDate(itinerary, leg.day, leg.originStop);
  }
  return new Date(Date.now() + 10 * 60 * 1000);
}

function createRouteCacheEntries(batch, directions, itinerary) {
  const { result: directionsResult } = directions;
  const resultLegs = directionsResult.routes?.[0]?.legs || [];
  if (resultLegs.length < batch.legs.length) {
    throw new Error(`路线结果缺少分段：需要 ${batch.legs.length} 段，只返回 ${resultLegs.length} 段`);
  }

  return Object.fromEntries(
    batch.legs.map((leg, index) => [
      getRouteCacheKey(leg, itinerary),
      createRouteCacheEntry(leg, directions, resultLegs[index]),
    ]),
  );
}

function createRouteCacheEntry(leg, directions, resultLeg) {
  const duration = resultLeg?.duration_in_traffic?.text || resultLeg?.duration?.text || "时间未知";
  const distance = resultLeg?.distance?.text || "距离未知";
  const departure = resultLeg?.departure_time?.text || leg.originStop.time || "";
  const arrival = resultLeg?.arrival_time?.text || "";

  return {
    createdAt: new Date().toISOString(),
    path: getDirectionsLegPath(resultLeg),
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

function getDirectionsLegPath(resultLeg) {
  const stepPath = (resultLeg?.steps || []).flatMap((step) => step.path || []);
  const path = stepPath.length ? stepPath : [resultLeg?.start_location, resultLeg?.end_location].filter(Boolean);
  return path.map(latLngToPoint).filter(Boolean);
}

function latLngToPoint(point) {
  if (!point) return null;
  const lat = typeof point.lat === "function" ? point.lat() : point.lat;
  const lng = typeof point.lng === "function" ? point.lng() : point.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
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

function getRouteCacheKey(leg, itinerary) {
  return routeHelpers.getRouteCacheKey(leg.day, leg.originStop, leg.destinationStop, itinerary.defaultTravelMode);
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
