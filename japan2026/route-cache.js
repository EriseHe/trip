"use strict";

(function attachRouteCacheHelpers(global) {
  const allowedModes = new Set(["DRIVING", "WALKING", "BICYCLING", "TRANSIT"]);

  function normalizeTravelMode(value) {
    const mode = String(value || "TRANSIT").trim().toUpperCase();
    return allowedModes.has(mode) ? mode : "TRANSIT";
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

  function formatCoordsForCache(coords) {
    if (!coords) return "missing";
    return `${Number(coords.lat).toFixed(6)},${Number(coords.lng).toFixed(6)}`;
  }

  function getRouteCacheKey(day, originStop, destinationStop, defaultTravelMode = "TRANSIT") {
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
    const offset = timeZoneOffsetFor(itinerary?.timezone);
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
    if (timezone === "Asia/Tokyo") return "+09:00";
    return null;
  }

  function friendlyDirectionsError(errorMessage) {
    if (String(errorMessage).includes("ZERO_RESULTS")) {
      return "Google 没有返回这段的可画路线；可用“打开 Google Maps 路线”查看。";
    }
    return "路线服务暂时没有结果；已保留计划连线。";
  }

  global.JapanRouteCache = {
    friendlyDirectionsError,
    getDepartureDate,
    getRouteCacheKey,
    getStopCoords,
    normalizeCoords,
    normalizeTravelMode,
  };
})(window);
