"use strict";

(function attachRouteCacheHelpers(global) {
  const modeAliases = {
    AIRPLANE: "FLIGHT",
    BULLET_TRAIN: "SHINKANSEN",
    HIGH_SPEED_RAIL: "SHINKANSEN",
    HIGH_SPEED_TRAIN: "SHINKANSEN",
    PLANE: "FLIGHT",
    RAIL: "TRAIN",
    RAILWAY: "TRAIN",
  };
  const allowedModes = new Set([
    "DRIVING",
    "WALKING",
    "BICYCLING",
    "TRANSIT",
    "TRAIN",
    "SHINKANSEN",
    "FLIGHT",
  ]);
  const skippedRouteModes = new Set(["TRAIN", "SHINKANSEN", "FLIGHT"]);

  function normalizeTravelMode(value) {
    const mode = String(value || "DRIVING").trim().toUpperCase();
    const normalizedMode = modeAliases[mode] || mode;
    return allowedModes.has(normalizedMode) ? normalizedMode : "DRIVING";
  }

  function isRouteCalculationSkipped(originStop, defaultTravelMode = "DRIVING") {
    return skippedRouteModes.has(normalizeTravelMode(originStop?.travelModeToNext || defaultTravelMode));
  }

  function normalizeCoords(value) {
    if (!value || typeof value !== "object") return null;
    const lat = Number(value.lat ?? value.latitude);
    const lng = Number(value.lng ?? value.longitude ?? value.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function getStopCoords(stop) {
    return normalizeCoords(stop?.coords) || normalizeCoords(stop?.location);
  }

  function estimateRouteBetweenStops(originStop, destinationStop, travelMode, profile = {}) {
    const origin = getStopCoords(originStop);
    const destination = getStopCoords(destinationStop);
    if (!origin || !destination) return null;

    const mode = normalizeTravelMode(travelMode);
    const directDistanceKm = distanceBetweenCoordsKm(origin, destination);
    const distanceFactor = positiveNumber(profile.distanceFactor) || defaultDistanceFactor(mode, directDistanceKm);
    const speedKph = positiveNumber(profile.speedKph) || defaultSpeedKph(mode, directDistanceKm);
    const distanceKm = directDistanceKm * distanceFactor;
    const durationMinutes = Math.max(mode === "DRIVING" ? 2 : 1, Math.round((distanceKm / speedKph) * 60));

    return {
      path: [origin, destination],
      distance: formatEstimatedDistance(distanceKm),
      duration: formatEstimatedDuration(durationMinutes),
      distanceKm,
      durationMinutes,
    };
  }

  function distanceBetweenCoordsKm(origin, destination) {
    const earthRadiusKm = 6371;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const latDelta = toRadians(destination.lat - origin.lat);
    const lngDelta = toRadians(destination.lng - origin.lng);
    const originLat = toRadians(origin.lat);
    const destinationLat = toRadians(destination.lat);
    const haversine =
      Math.sin(latDelta / 2) ** 2 +
      Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(lngDelta / 2) ** 2;
    return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
  }

  function defaultDistanceFactor(mode, directDistanceKm) {
    if (mode === "WALKING") return 1.15;
    if (mode === "DRIVING") return directDistanceKm >= 20 ? 1.18 : 1.25;
    return 1;
  }

  function defaultSpeedKph(mode, directDistanceKm) {
    if (mode === "WALKING") return 4.5;
    if (mode === "DRIVING") {
      if (directDistanceKm >= 20) return 50;
      if (directDistanceKm >= 5) return 28;
      return 22;
    }
    return 25;
  }

  function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function formatEstimatedDistance(distanceKm) {
    if (distanceKm < 1) {
      const meters = Math.max(50, Math.round((distanceKm * 1000) / 50) * 50);
      return `约 ${meters} 米`;
    }
    return `约 ${distanceKm.toFixed(1)} 公里`;
  }

  function formatEstimatedDuration(durationMinutes) {
    if (durationMinutes < 60) return `约 ${durationMinutes} 分钟`;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes ? `约 ${hours} 小时 ${minutes} 分钟` : `约 ${hours} 小时`;
  }

  function formatCoordsForCache(coords) {
    if (!coords) return "missing";
    return `${Number(coords.lat).toFixed(6)},${Number(coords.lng).toFixed(6)}`;
  }

  function getRouteCacheKey(day, originStop, destinationStop, defaultTravelMode = "DRIVING") {
    const origin = getStopCoords(originStop);
    const destination = getStopCoords(destinationStop);
    const travelMode = normalizeTravelMode(originStop?.travelModeToNext || defaultTravelMode);
    return [
      day?.date || day?.id || "",
      originStop?.time || "",
      travelMode,
      formatCoordsForCache(origin),
      formatCoordsForCache(destination),
    ].join("|");
  }

  function getDepartureDate(itinerary, day, stop) {
    const rawTime = stop?.departAt || stop?.time;
    const offset = itinerary?.timezoneOffset || timeZoneOffsetFor(itinerary?.timezone);
    if (!day?.date || !rawTime || !offset) {
      return new Date(Date.now() + 10 * 60 * 1000);
    }

    const normalizedTime = String(rawTime).length === 5 ? `${rawTime}:00` : rawTime;
    const plannedDate = new Date(`${day.date}T${normalizedTime}${offset}`);
    if (Number.isNaN(plannedDate.getTime()) || plannedDate < new Date()) {
      return new Date(Date.now() + 10 * 60 * 1000);
    }
    return plannedDate;
  }

  function timeZoneOffsetFor(timezone) {
    if (["Asia/Tokyo", "Asia/Seoul"].includes(timezone)) return "+09:00";
    if (timezone === "Asia/Shanghai") return "+08:00";
    if (timezone === "America/New_York") return "-04:00";
    return null;
  }

  function friendlyDirectionsError(errorMessage) {
    if (String(errorMessage).includes("ZERO_RESULTS")) {
      return "Google 没有返回这段的可画路线；可用“打开 Google Maps 路线”查看。";
    }
    return "路线服务暂时没有结果；已保留计划连线。";
  }

  const helpers = {
    estimateRouteBetweenStops,
    friendlyDirectionsError,
    getDepartureDate,
    getRouteCacheKey,
    getStopCoords,
    isRouteCalculationSkipped,
    normalizeCoords,
    normalizeTravelMode,
  };

  global.TripRouteCache = helpers;
})(window);
