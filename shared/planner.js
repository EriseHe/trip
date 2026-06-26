"use strict";

const TRIP_CONFIG = window.TRIP_PLANNER_CONFIG || {};
const TRIP_ID = TRIP_CONFIG.id || inferTripId();
const ITINERARY_SOURCES = {
  official: "official",
  local: "local",
};
const STORAGE_KEYS = {
  localVersion: `${TRIP_ID}-itinerary-map:local-version:v2`,
  activeSource: `${TRIP_ID}-itinerary-map:active-source:v2`,
  legacyItinerary: `${TRIP_ID}-itinerary-map:itinerary:v1`,
};

const DEFAULT_MAP_ID = "DEMO_MAP_ID";
const MAX_GOOGLE_MAPS_URL_WAYPOINTS = 9;
const DAY_COLORS = ["#0f766e", "#2563eb", "#c2410c", "#7c3aed", "#be123c", "#15803d"];
const UNBOXED_STOP_TYPES = new Set(["hotel", "station"]);

const DEFAULT_ITINERARY = {
  tripTitle: TRIP_CONFIG.title || "Trip Planner",
  timezone: TRIP_CONFIG.timezone || "Asia/Tokyo",
  defaultTravelMode: "DRIVING",
  map: {
    center: TRIP_CONFIG.map?.center || { lat: 35.681236, lng: 139.767125 },
    zoom: TRIP_CONFIG.map?.zoom || 11,
    mapId: TRIP_CONFIG.map?.mapId || DEFAULT_MAP_ID,
  },
  days: [
    {
      id: "sample-day",
      date: "2026-01-01",
      label: "1/1 · Sample",
      color: DAY_COLORS[0],
      stops: [
        {
          id: "sample-stop",
          time: "09:00",
          duration: "1h",
          title: "Sample stop",
          place: TRIP_CONFIG.geocode?.defaultCountry || "",
          notes: "Add itinerary.json for this trip.",
          type: "destination",
        },
      ],
    },
  ],
};

const state = {
  itinerary: null,
  selectedDayId: "all",
  map: null,
  libs: null,
  geocoder: null,
  infoWindow: null,
  markers: [],
  connectionLines: [],
  legSummariesByDay: new globalThis.Map(),
  routeCache: {},
  routeCacheMeta: {},
  mapsScriptPromise: null,
  locationMarker: null,
  locationWatchId: null,
  defaultItinerary: null,
  localVersion: null,
  activeSource: ITINERARY_SOURCES.official,
  editorSource: ITINERARY_SOURCES.official,
  mobileView: "planner",
};

const els = {};

window.gm_authFailure = () => {
  setStatus(
    "Google Maps API key 被拒绝。请在 Google Cloud 里启用 Maps JavaScript API，并把 http://localhost:5173/* 加到 HTTP referrer 白名单。",
    true,
  );
};

document.addEventListener("DOMContentLoaded", () => void initApp());

async function initApp() {
  cacheElements();
  applyPageConfig();
  bindEvents();

  const configuredApiKey = getActiveApiKey();
  state.defaultItinerary = await loadDefaultItinerary();
  state.routeCacheMeta = await loadRouteCacheFile();
  state.localVersion = loadLocalVersion();
  const preferredSource = readStoredValue(STORAGE_KEYS.activeSource);
  const initialSource =
    preferredSource === ITINERARY_SOURCES.local && state.localVersion
      ? ITINERARY_SOURCES.local
      : ITINERARY_SOURCES.official;
  activateItinerarySource(initialSource, { persist: false });
  updateTripClock();
  setInterval(updateTripClock, 30000);

  if (configuredApiKey && shouldAutoLoadMap()) {
    void bootMap();
  } else if (configuredApiKey) {
    setStatus("行程已载入。地图会显示仓库里的路线缓存。");
  } else {
    setStatus("行程已载入。地图配置缺少 Google Maps API key。", true);
  }
}

function inferTripId() {
  return window.location.pathname.split("/").filter(Boolean).pop() || "trip";
}

function applyPageConfig() {
  document.title = TRIP_CONFIG.documentTitle || `${TRIP_CONFIG.title || "Trip"} Live Itinerary Map`;
  if (els.tripEyebrow) els.tripEyebrow.textContent = TRIP_CONFIG.eyebrow || "Trip planner";
  if (els.tripHeading) els.tripHeading.textContent = TRIP_CONFIG.title || "Trip Planner";
  if (els.tripClock) els.tripClock.textContent = `${getClockLabel()} --:--`;
}

function getClockLabel() {
  return TRIP_CONFIG.clockLabel || "当地时间";
}

function mapScriptLocaleParams() {
  const language = TRIP_CONFIG.map?.language || window.TRIP_SITE_CONFIG?.mapLanguage || "zh-CN";
  const params = [
    `&language=${encodeURIComponent(language)}`,
    TRIP_CONFIG.map?.region ? `&region=${encodeURIComponent(TRIP_CONFIG.map.region)}` : "",
  ];
  return params.join("");
}

function getLocalConfigApiKey() {
  return TRIP_CONFIG.map?.apiKey || window.TRIP_SITE_CONFIG?.googleMapsApiKey || "";
}

function getActiveApiKey() {
  return getLocalConfigApiKey();
}

function shouldAutoLoadMap() {
  return TRIP_CONFIG.map?.autoLoadMap !== false;
}

async function loadDefaultItinerary() {
  try {
    return await fetchTripJson("./itinerary.json");
  } catch (error) {
    setStatus(`无法读取 itinerary.json，使用内建示例：${error.message}`, true);
    return DEFAULT_ITINERARY;
  }
}

async function loadRouteCacheFile() {
  try {
    const parsed = await fetchTripJson("./route-cache.json");
    const routes = parsed?.routes && typeof parsed.routes === "object" ? parsed.routes : parsed;
    state.routeCache = routes && typeof routes === "object" && !Array.isArray(routes) ? routes : {};
    return {
      generatedAt: parsed?.generatedAt || "",
      itineraryHash: parsed?.itineraryHash || "",
      routeCount: Object.keys(state.routeCache).length,
      approximateCount: Number(parsed?.approximateCount || 0),
      source: parsed?.source || "route-cache.json",
      version: parsed?.version || 1,
    };
  } catch {
    state.routeCache = {};
    return {
      generatedAt: "",
      itineraryHash: "",
      routeCount: 0,
      approximateCount: 0,
      source: "route-cache.json",
      version: 1,
    };
  }
}

async function fetchTripJson(path) {
  const url = new URL(path, window.location.href);
  url.searchParams.set("v", String(Date.now()));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function cacheElements() {
  els.topControls = document.querySelector(".trip-controls");
  els.editorToggle = document.querySelector("#editor-toggle");
  els.mobileTabs = document.querySelector(".mobile-view-tabs");
  els.mapView = document.querySelector("#map-view");
  els.editorView = document.querySelector("#editor-view");
  els.tripClock = document.querySelector("#trip-clock");
  els.sourceIndicator = document.querySelector("#source-indicator");
  els.tripEyebrow = document.querySelector("#trip-eyebrow");
  els.tripHeading = document.querySelector("#trip-heading");
  els.dayTabs = document.querySelector("#day-tabs");
  els.timeline = document.querySelector("#timeline");
  els.editor = document.querySelector("#itinerary-json");
  els.applyJson = document.querySelector("#apply-json");
  els.downloadJson = document.querySelector("#download-json");
  els.copyJson = document.querySelector("#copy-json");
  els.deleteLocalVersion = document.querySelector("#delete-local-version");
  els.sourceSwitch = document.querySelector("#itinerary-source-switch");
  els.sourceDescription = document.querySelector("#source-description");
  els.jsonFile = document.querySelector("#json-file");
  els.map = document.querySelector("#map");
  els.status = document.querySelector("#status");
  els.locateMe = document.querySelector("#locate-me");
  els.openGoogleMaps = document.querySelector("#open-google-maps");
}

function bindEvents() {
  els.editorToggle.addEventListener("click", toggleEditorPage);
  els.mobileTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mobile-view]");
    if (!button) return;
    setMobileView(button.dataset.mobileView);
  });
  els.applyJson.addEventListener("click", applyJsonFromEditor);
  els.downloadJson.addEventListener("click", downloadItinerary);
  els.copyJson.addEventListener("click", () => void copyItineraryCode());
  els.deleteLocalVersion.addEventListener("click", deleteLocalVersion);
  els.sourceSwitch.addEventListener("click", handleSourceSwitch);
  els.jsonFile.addEventListener("change", handleJsonFile);
  els.openGoogleMaps.addEventListener("click", openSelectedDayInGoogleMaps);
  els.locateMe.addEventListener("click", toggleLiveLocation);
  els.dayTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-day-id]");
    if (!button || button.disabled) return;

    state.selectedDayId = state.selectedDayId === button.dataset.dayId ? "all" : button.dataset.dayId;
    renderPlan();
    if (state.map) {
      void renderMapForSelection();
    }
  });
  els.timeline.addEventListener("click", (event) => {
    const itemNode = event.target.closest("[data-stop-id], [data-maps-query]");
    if (!itemNode) return;
    openTimelineItem(itemNode);
  });
  els.timeline.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const itemNode = event.target.closest("[data-stop-id], [data-maps-query]");
    if (!itemNode) return;
    event.preventDefault();
    openTimelineItem(itemNode);
  });
}

function toggleEditorPage() {
  setEditorVisible(els.editorView.hidden);
}

function setEditorVisible(isVisible) {
  els.mapView.hidden = isVisible;
  els.editorView.hidden = !isVisible;
  els.mobileTabs.hidden = isVisible;
  els.topControls.hidden = isVisible;
  els.editorToggle.textContent = isVisible ? "返回行程" : "编辑行程";

  if (isVisible) {
    state.editorSource = state.activeSource;
    syncEditorFromSource();
    updateSourceUi();
  }

  if (!isVisible && state.map) {
    google.maps.event.trigger(state.map, "resize");
    fitMapToDays(getVisibleDays());
  }
}

function setMobileView(view) {
  state.mobileView = view === "map" ? "map" : "planner";
  els.mapView.dataset.mobileView = state.mobileView;
  els.mobileTabs.querySelectorAll("[data-mobile-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileView === state.mobileView);
  });

  if (state.mobileView === "map" && state.map) {
    google.maps.event.trigger(state.map, "resize");
    fitMapToDays(getVisibleDays());
  }
}

function applyJsonFromEditor() {
  if (state.editorSource === ITINERARY_SOURCES.official) {
    setStatus("官方行程只能下载或复制；切到本地行程后再更新。", true);
    return;
  }

  try {
    const parsed = JSON.parse(els.editor.value);
    const localItinerary = normalizeItinerary(parsed);
    if (!saveLocalVersion(localItinerary)) {
      throw new Error("浏览器无法保存本地行程，请检查隐私或存储设置");
    }
    state.activeSource = ITINERARY_SOURCES.local;
    state.editorSource = ITINERARY_SOURCES.local;
    writeStoredValue(STORAGE_KEYS.activeSource, state.activeSource);
    applyItinerary(state.localVersion.itinerary);
    updateSourceUi();
    setStatus("本地行程已更新到这个浏览器。官方行程没有被修改。");
  } catch (error) {
    setStatus(`JSON 解析失败：${error.message}`, true);
  }
}

function applyItinerary(rawItinerary) {
  try {
    state.itinerary = normalizeItinerary(rawItinerary);
  } catch (error) {
    setStatus(`行程格式不正确：${error.message}`, true);
    return;
  }

  const selectedStillExists =
    state.selectedDayId === "all" || state.itinerary.days.some((day) => day.id === state.selectedDayId);
  if (!selectedStillExists) {
    state.selectedDayId = state.itinerary.days[0]?.id || "all";
  }
  state.legSummariesByDay.clear();

  syncEditorFromItinerary();
  renderPlan();

  if (state.map) {
    createOrUpdateMap();
    void renderMapForSelection();
  }
}

function normalizeItinerary(rawItinerary) {
  if (!rawItinerary || typeof rawItinerary !== "object") {
    throw new Error("顶层必须是 object");
  }
  if (!Array.isArray(rawItinerary.days) || rawItinerary.days.length === 0) {
    throw new Error("必须包含 days 数组");
  }

  const itinerary = clone(rawItinerary);
  itinerary.tripTitle = itinerary.tripTitle || TRIP_CONFIG.title || "Trip Planner";
  itinerary.timezone = itinerary.timezone || TRIP_CONFIG.timezone || "Asia/Tokyo";
  itinerary.timezoneOffset = itinerary.timezoneOffset || TRIP_CONFIG.timezoneOffset || "";
  itinerary.defaultTravelMode = normalizeTravelMode(itinerary.defaultTravelMode || "DRIVING");
  itinerary.map = itinerary.map || {};
  itinerary.map.center =
    normalizeCoords(itinerary.map.center) || normalizeCoords(TRIP_CONFIG.map?.center) || DEFAULT_ITINERARY.map.center;
  itinerary.map.zoom = Number.isFinite(Number(itinerary.map.zoom))
    ? Number(itinerary.map.zoom)
    : Number(TRIP_CONFIG.map?.zoom || 11);
  itinerary.map.mapId = itinerary.map.mapId || TRIP_CONFIG.map?.mapId || DEFAULT_MAP_ID;

  itinerary.days = itinerary.days.map((day, dayIndex) => {
    if (!day || typeof day !== "object") {
      throw new Error(`days[${dayIndex}] 必须是 object`);
    }
    if (!Array.isArray(day.stops) || day.stops.length === 0) {
      throw new Error(`${day.label || day.id || `Day ${dayIndex + 1}`} 必须包含 stops`);
    }

    const normalizedDay = { ...day };
    normalizedDay.id = normalizedDay.id || slugify(normalizedDay.label || `day-${dayIndex + 1}`);
    normalizedDay.label = normalizedDay.label || `Day ${dayIndex + 1}`;
    normalizedDay.color = normalizedDay.color || DAY_COLORS[dayIndex % DAY_COLORS.length];
    normalizedDay.stops = day.stops.map((stop, stopIndex) => normalizeStop(stop, normalizedDay, stopIndex));
    return normalizedDay;
  });

  return itinerary;
}

function normalizeStop(stop, day, stopIndex) {
  if (!stop || typeof stop !== "object") {
    throw new Error(`${day.label} stops[${stopIndex}] 必须是 object`);
  }

  const normalizedStop = { ...stop };
  normalizedStop.id = normalizedStop.id || `${day.id}-stop-${stopIndex + 1}`;
  normalizedStop.title =
    normalizedStop.title || normalizedStop.name || normalizedStop.place || `Stop ${stopIndex + 1}`;
  normalizedStop.place = normalizedStop.place || normalizedStop.address || normalizedStop.title;
  normalizedStop.time = normalizedStop.time || "";
  normalizedStop.coords = normalizeCoords(normalizedStop.coords) || normalizeCoords(normalizedStop.location);
  if (!normalizedStop.coords) {
    normalizedStop.coords = normalizeCoords({
      lat: normalizedStop.lat || normalizedStop.latitude,
      lng: normalizedStop.lng || normalizedStop.longitude,
    });
  }
  normalizedStop.travelModeToNext = normalizeTravelMode(
    normalizedStop.travelModeToNext || day.defaultTravelMode || state.itinerary?.defaultTravelMode || "DRIVING",
  );
  normalizedStop.type = normalizeStopType(normalizedStop.type || inferStopType(normalizedStop));

  return normalizedStop;
}

async function bootMap() {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    setStatus("需要先输入 Google Maps API key。", true);
    return;
  }

  setStatus("正在加载 Google Maps...");

  try {
    await loadGoogleMapsScript(apiKey);
    await loadGoogleMapsLibraries();
    createOrUpdateMap();
    await renderMapForSelection();
  } catch (error) {
    setStatus(`地图加载失败：${error.message}`, true);
  }
}

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }
  if (state.mapsScriptPromise) {
    return state.mapsScriptPromise;
  }

  state.mapsScriptPromise = new Promise((resolve, reject) => {
    const callbackName = `__tripItineraryMapLoaded_${TRIP_ID.replace(/\W/g, "_")}`;
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&v=weekly&loading=async" +
      mapScriptLocaleParams() +
      `&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("无法下载 Google Maps JavaScript API"));
    document.head.appendChild(script);
  });

  return state.mapsScriptPromise;
}

async function loadGoogleMapsLibraries() {
  if (state.libs) return state.libs;

  const [maps, marker] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("marker"),
  ]);

  state.libs = { maps, marker };
  state.infoWindow = new google.maps.InfoWindow();
  return state.libs;
}

async function ensureGeocodingLibrary() {
  if (!state.libs.geocoding) {
    state.libs.geocoding = await google.maps.importLibrary("geocoding");
  }
  if (!state.geocoder) {
    state.geocoder = new state.libs.geocoding.Geocoder();
  }
}

function createOrUpdateMap() {
  const { Map: GoogleMap } = state.libs.maps;
  const center = getMapCenter();
  const mapOptions = {
    center,
    zoom: state.itinerary.map.zoom,
    mapId: state.itinerary.map.mapId || DEFAULT_MAP_ID,
    fullscreenControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    gestureHandling: "greedy",
  };

  if (!state.map) {
    els.map.replaceChildren();
    state.map = new GoogleMap(els.map, mapOptions);
  } else {
    state.map.setOptions(mapOptions);
  }
}

async function renderMapForSelection() {
  if (!state.map || !state.libs) return;

  clearMapArtifacts();
  const visibleDays = getVisibleDays();
  await ensureCoordinatesForDays(visibleDays);

  drawMarkers(visibleDays);
  renderCachedRoutesOrPlanned(visibleDays);
  fitMapToDays(visibleDays);

  const summaries = visibleDays
    .flatMap((day) => state.legSummariesByDay.get(day.id) || [])
    .filter(Boolean);
  const cachedLegs = summaries.filter((summary) => summary.cached).length;
  const plannedLegs = summaries.filter((summary) => summary.planned).length;

  if (state.selectedDayId === "all") {
    renderPlan();
    const cacheText =
      state.routeCacheMeta.routeCount > 0
        ? `已读取 route-cache.json 的 ${state.routeCacheMeta.routeCount} 段路线。`
        : "route-cache.json 暂无路线缓存。";
    setStatus(
      `已显示 ${countStopsWithCoords(visibleDays)} 个地点。${cacheText}${plannedLegs ? ` ${plannedLegs} 段显示计划连线。` : ""}`,
    );
    return;
  }

  const day = visibleDays[0];
  renderPlan();
  const routeText =
    cachedLegs > 0
      ? `已从 route-cache.json 加载 ${cachedLegs} 段路线。`
      : "这一日还没有缓存路线。";
  setStatus(`已显示 ${day.label}：${day.stops.length} 个地点。${routeText}`);
}

async function ensureCoordinatesForDays(days) {
  const missingStops = [];
  for (const day of days) {
    for (const stop of day.stops) {
      if (!getStopCoords(stop)) {
        missingStops.push({ day, stop });
      }
    }
  }

  if (missingStops.length === 0) return;

  await ensureGeocodingLibrary();
  setStatus(`正在用地点名补全 ${missingStops.length} 个坐标...`);
  for (const { day, stop } of missingStops) {
    const query = buildGeocodeQuery(stop, day);
    try {
      const result = await geocodeAddress(query);
      stop.coords = result.coords;
      stop.geocodedAddress = result.formattedAddress;
    } catch (error) {
      stop.geocodeError = error.message;
    }
  }

  if (state.activeSource === ITINERARY_SOURCES.local) {
    saveLocalVersion(state.itinerary);
  }
  syncEditorFromItinerary();
}

function buildGeocodeQuery(stop, day) {
  const query = getStopUrlQuery(stop);
  if (queryIncludesCountry(query)) {
    return query;
  }
  return [query, getCityHint(day), TRIP_CONFIG.geocode?.defaultCountry].filter(Boolean).join(", ");
}

function queryIncludesCountry(query) {
  const countryTerms = TRIP_CONFIG.geocode?.countryTerms || [];
  return countryTerms.some((term) => new RegExp(escapeRegExp(term), "i").test(query));
}

function getCityHint(day) {
  const label = String(day.label || "");
  const match = (TRIP_CONFIG.geocode?.cityHints || []).find(({ pattern }) => matchesConfigPattern(label, pattern));
  return match?.city || TRIP_CONFIG.geocode?.defaultCity || "";
}

function getGeocodeRequestOptions() {
  return TRIP_CONFIG.geocode?.countryCode
    ? { componentRestrictions: { country: TRIP_CONFIG.geocode.countryCode } }
    : {};
}

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    state.geocoder.geocode(
      {
        address,
        ...getGeocodeRequestOptions(),
      },
      (results, status) => {
        if (status !== "OK" || !results?.[0]) {
          reject(new Error(`找不到坐标：${address} (${status})`));
          return;
        }

        const location = results[0].geometry.location;
        resolve({
          coords: { lat: location.lat(), lng: location.lng() },
          formattedAddress: results[0].formatted_address,
        });
      },
    );
  });
}

function drawMarkers(days) {
  const { AdvancedMarkerElement } = state.libs.marker;
  let markerNumber = 1;

  for (const day of days) {
    day.stops.forEach((stop, stopIndex) => {
      const position = getStopCoords(stop);
      if (!position) return;

      const marker = new AdvancedMarkerElement({
        map: state.map,
        position,
        title: `${stop.time ? `${stop.time} · ` : ""}${stop.title}`,
        content: createMarkerContent(markerNumber, day.color),
      });

      marker.addEventListener("gmp-click", () => openStopInfoWindow(day, stop, stopIndex, marker));
      state.markers.push({ day, stop, marker });
      markerNumber += 1;
    });
  }
}

function renderCachedRoutesOrPlanned(days) {
  for (const day of days) {
    const summaries = [];

    for (let index = 0; index < day.stops.length - 1; index += 1) {
      const originStop = day.stops[index];
      const destinationStop = day.stops[index + 1];
      const cacheKey = getRouteCacheKey(day, originStop, destinationStop);
      const cachedRoute = state.routeCache[cacheKey];
      if (shouldSkipRouteCalculation(originStop)) {
        summaries.push(createPlannedLegSummary(originStop, destinationStop));
        continue;
      }

      if (cachedRoute) {
        drawCachedRoute(cachedRoute, day.color);
        summaries.push({
          ...cachedRoute.summary,
          duration:
            cachedRoute.summary?.fallback && originStop.travelDurationToNext
              ? originStop.travelDurationToNext
              : cachedRoute.summary?.duration,
          navigation: originStop.navigationToNext || cachedRoute.summary?.navigation || "",
          cached: true,
        });
      } else {
        drawConnectionLine(originStop, destinationStop, day.color, true);
        summaries.push(createPlannedLegSummary(originStop, destinationStop));
      }
    }

    state.legSummariesByDay.set(day.id, summaries);
  }
}

function createPlannedLegSummary(originStop, destinationStop) {
  return {
    fromStopId: originStop.id,
    toStopId: destinationStop.id,
    travelMode: normalizeTravelMode(originStop.travelModeToNext || state.itinerary.defaultTravelMode),
    duration: "未计算",
    distance: "计划连线",
    navigation: originStop.navigationToNext || "",
    planned: true,
  };
}

function drawCachedRoute(routeCacheEntry, color) {
  const path = routeCacheEntry.path?.length ? routeCacheEntry.path : null;
  if (!path) return;

  if (routeCacheEntry.summary?.fallback || routeCacheEntry.summary?.approximate) {
    drawConnectionLine({ coords: path[0] }, { coords: path[path.length - 1] }, color, true);
    return;
  }

  const line = new google.maps.Polyline({
    map: state.map,
    path,
    strokeColor: color,
    strokeOpacity: 0.82,
    strokeWeight: 5,
  });
  state.connectionLines.push(line);
}

function drawConnectionLine(originStop, destinationStop, color, dashed = false) {
  const origin = getStopCoords(originStop);
  const destination = getStopCoords(destinationStop);
  if (!origin || !destination) return;

  const line = new google.maps.Polyline({
    map: state.map,
    path: [origin, destination],
    geodesic: true,
    strokeColor: color,
    strokeOpacity: dashed ? 0 : 0.42,
    strokeWeight: 3,
    icons: dashed
      ? [
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 0.72, scale: 3 },
            offset: "0",
            repeat: "14px",
          },
        ]
      : undefined,
  });
  state.connectionLines.push(line);
}

function renderPlan() {
  renderDayTabs();
  renderTimeline();
}

function renderDayTabs() {
  const fragment = document.createDocumentFragment();

  state.itinerary.days.forEach((day) => {
    fragment.appendChild(createDayTab(day, state.selectedDayId === day.id));
  });

  els.dayTabs.replaceChildren(fragment);
}

function createDayTab(day, isActive) {
  const isPast = isDayPast(day);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `day-tab${isActive && !isPast ? " active" : ""}${isPast ? " past" : ""}`;
  button.dataset.dayId = day.id;
  button.textContent = getDayTabLabel(day);
  button.disabled = isPast;
  if (isPast) {
    button.setAttribute("aria-label", `${button.textContent}，已结束`);
  }
  return button;
}

function isDayPast(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day.date || ""))) return false;
  const timezone = state.itinerary?.timezone || TRIP_CONFIG.timezone || "Asia/Tokyo";
  return day.date < getZonedDateParts(timezone).date;
}

function getDayTabLabel(day) {
  const dayOfMonth = getDayOfMonth(day);
  const place = getDayTabPlace(day);
  return [dayOfMonth, place].filter(Boolean).join(" · ");
}

function getDayOfMonth(day) {
  const dateDay = String(day.date || "").match(/^\d{4}-\d{2}-(\d{2})$/);
  if (dateDay) return String(Number(dateDay[1]));

  const label = String(day.label || "");
  const labelMatch = /^(\d{1,2})\/(\d{1,2})(.*)$/.exec(label);
  if (labelMatch) {
    return String(Number(labelMatch[2]));
  }

  return label;
}

function getDayTabPlace(day) {
  if (day.tabPlace) return String(day.tabPlace).trim();

  const label = String(day.label || "");
  const match = (TRIP_CONFIG.dayTabPlaces || []).find(({ pattern }) => matchesConfigPattern(label, pattern));
  if (match) return match.label;

  return getFallbackDayTabPlace(label);
}

function getFallbackDayTabPlace(label) {
  return label
    .replace(/^\d{1,2}\/\d{1,2}\s*·\s*/, "")
    .split(/[\/→·]/)[0]
    .replace(/抵达|抵達|最后一天|一日游|东侧|西侧|東側|西側/g, "")
    .trim();
}

function renderTimeline() {
  const fragment = document.createDocumentFragment();
  const days = getVisibleDays();

  days.forEach((day) => {
    if (state.selectedDayId === "all") {
      const heading = document.createElement("div");
      heading.className = "day-heading";
      heading.textContent = `${day.label}${day.date ? ` · ${day.date}` : ""}`;
      fragment.appendChild(heading);
    }

    const blocks = window.TripTimelineModel.buildTimelineBlocks(day, state.legSummariesByDay.get(day.id) || [], {
      defaultTravelMode: state.itinerary.defaultTravelMode,
    });
    blocks.forEach((block, index) => {
      fragment.appendChild(createTimelineBlockNode(day, block, index, blocks.length));
      if (index < blocks.length - 1) {
        fragment.appendChild(createTimelineConnectorNode(block.connectionToNext));
      }
    });
  });

  els.timeline.replaceChildren(fragment);
}

function createTimelineBlockNode(day, block, index, blockCount) {
  const node = document.createElement("section");
  const hasHotel = block.items.some((item) => getTimelineItemType(item) === "hotel");
  node.className = `timeline-block${index === 0 ? " is-day-first" : ""}${index === blockCount - 1 ? " is-day-last" : ""}${hasHotel ? " has-hotel" : ""}`;
  const rail = createTimelineRailNode(true);

  const time = document.createElement("div");
  time.className = "timeline-time";
  time.textContent = block.time;

  const items = document.createElement("div");
  items.className = "timeline-items";
  block.items.forEach((item) => {
    items.appendChild(createTimelineItemNode(day, item));
  });

  node.append(rail, time, items);
  return node;
}

function createTimelineItemNode(day, item) {
  const stop = item.stop || item;
  const stopType = getTimelineItemType(item);
  const node = document.createElement("article");
  node.className = `timeline-item timeline-item--${stopType}${UNBOXED_STOP_TYPES.has(stopType) ? " timeline-item--plain" : ""}${item.stop && isStopCurrent(day, item.stop) ? " is-now" : ""}`;
  node.tabIndex = 0;
  node.role = "link";
  node.title = "在 Google Maps 中打开";
  if (item.stopId) {
    node.dataset.dayId = day.id;
    node.dataset.stopId = item.stopId;
  } else {
    node.dataset.mapsQuery = item.mapsQuery || item.title;
  }

  const title = document.createElement("h3");
  title.textContent = item.title;
  node.appendChild(title);

  const detailParts = [item.duration, item.notes, stop.geocodeError].filter(Boolean);
  if (detailParts.length) {
    const details = document.createElement("p");
    details.textContent = detailParts.join(" · ");
    node.appendChild(details);
  }
  return node;
}

function getTimelineItemType(item) {
  const stop = item.stop || item;
  return normalizeStopType(stop.type || inferStopType(stop));
}

function createTimelineRailNode(hasDot = false) {
  const rail = document.createElement("span");
  rail.className = `timeline-rail${hasDot ? " timeline-rail--stop" : ""}`;
  rail.setAttribute("aria-hidden", "true");

  if (hasDot) {
    const dot = document.createElement("span");
    dot.className = "timeline-dot";
    rail.appendChild(dot);
  }

  return rail;
}

function createTimelineConnectorNode(connection) {
  const node = document.createElement("div");
  node.className = `timeline-connector${connection?.detailed ? " is-detailed" : ""}`;
  const rail = createTimelineRailNode();

  const mode = document.createElement("div");
  mode.className = "timeline-connector-mode";
  if (connection?.showDetails) {
    mode.textContent = modeLabel(connection.summary?.travelMode || connection.mode);
  }

  const content = document.createElement("div");
  content.className = "timeline-connector-content";
  if (connection?.showDetails) {
    const metrics = document.createElement("div");
    metrics.className = "timeline-connector-metrics";
    metrics.textContent = formatLegMetrics(connection.summary);
    content.appendChild(metrics);

    if (connection.detailed && connection.note) {
      const note = document.createElement("p");
      note.className = "timeline-connector-note";
      note.textContent = connection.note;
      content.appendChild(note);
    }
  }

  node.append(rail, mode, content);
  return node;
}

function formatLegMetrics(summary = {}) {
  if (summary.planned) {
    return summary.duration && summary.duration !== "未计算"
      ? summary.duration
      : "未计算路线";
  }
  const duration = summary.duration && summary.duration !== "未计算" ? summary.duration : "";
  const distance = summary.distance && !summary.fallback && summary.distance !== "计划连线" ? summary.distance : "";
  return [duration, distance].filter(Boolean).join(" · ");
}

function openStopInfoWindow(day, stop, stopIndex, marker) {
  const stopType = normalizeStopType(stop.type || inferStopType(stop));
  const content = `
    <div class="info-window info-window--${stopType}">
      <h3>${escapeHtml(stop.title)}</h3>
      <p>${escapeHtml(day.label)}${day.date ? ` · ${escapeHtml(day.date)}` : ""}</p>
      <p>${escapeHtml(stop.time || "--:--")}${stop.duration ? ` · ${escapeHtml(stop.duration)}` : ""}</p>
      ${stop.notes ? `<p>${escapeHtml(stop.notes)}</p>` : ""}
      <p>第 ${stopIndex + 1} 站</p>
    </div>
  `;
  state.infoWindow.setContent(content);
  state.infoWindow.open({ anchor: marker, map: state.map });
}

function openStopFromTimeline(dayId, stopId) {
  const day = state.itinerary.days.find((candidate) => candidate.id === dayId);
  const stop = day?.stops.find((candidate) => candidate.id === stopId);
  if (!stop) return;
  openStopInGoogleMaps(stop);
}

function openTimelineItem(itemNode) {
  if (itemNode.dataset.stopId) {
    openStopFromTimeline(itemNode.dataset.dayId, itemNode.dataset.stopId);
    return;
  }

  const query = itemNode.dataset.mapsQuery;
  if (!query) return;
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function openStopInGoogleMaps(stop) {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", getStopMapsQuery(stop));
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function fitMapToDays(days) {
  const bounds = new google.maps.LatLngBounds();
  let hasAnyPoint = false;

  for (const day of days) {
    for (const stop of day.stops) {
      const coords = getStopCoords(stop);
      if (!coords) continue;
      bounds.extend(coords);
      hasAnyPoint = true;
    }
  }

  if (!hasAnyPoint) {
    state.map.setCenter(getMapCenter());
    state.map.setZoom(state.itinerary.map.zoom);
    return;
  }

  state.map.fitBounds(bounds, 72);
}

function clearMapArtifacts() {
  state.markers.forEach(({ marker }) => {
    marker.map = null;
  });
  clearRouteArtifacts();
  state.markers = [];
}

function clearRouteArtifacts() {
  state.connectionLines.forEach((line) => line.setMap(null));
  state.connectionLines = [];
}

function toggleLiveLocation() {
  if (!state.map || !state.libs) {
    setStatus("请先加载地图，再启用定位。", true);
    return;
  }
  if (!navigator.geolocation) {
    setStatus("这个浏览器不支持定位。", true);
    return;
  }

  if (state.locationWatchId !== null) {
    navigator.geolocation.clearWatch(state.locationWatchId);
    state.locationWatchId = null;
    els.locateMe.textContent = "定位我";
    if (state.locationMarker) {
      state.locationMarker.map = null;
      state.locationMarker = null;
    }
    setStatus("已停止定位。");
    return;
  }

  state.locationWatchId = navigator.geolocation.watchPosition(updateLiveLocation, handleLocationError, {
    enableHighAccuracy: true,
    maximumAge: 15000,
    timeout: 12000,
  });
  els.locateMe.textContent = "停止定位";
  setStatus("正在获取当前位置...");
}

function updateLiveLocation(position) {
  const coords = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };

  if (!state.locationMarker) {
    const { AdvancedMarkerElement } = state.libs.marker;
    state.locationMarker = new AdvancedMarkerElement({
      map: state.map,
      position: coords,
      title: "你的位置",
      content: createLocationDot(),
    });
  } else {
    state.locationMarker.position = coords;
  }

  state.map.panTo(coords);
  setStatus(`当前位置已更新，精度约 ${Math.round(position.coords.accuracy)} 米。`);
}

function handleLocationError(error) {
  setStatus(`定位失败：${error.message}`, true);
}

function openSelectedDayInGoogleMaps() {
  const day = getSelectedDay();
  if (!day) {
    setStatus("请先选择具体某一天，再打开 Google Maps 路线。", true);
    return;
  }

  const usableStops = day.stops.filter((stop) => getStopCoords(stop) || getStopUrlQuery(stop));
  if (usableStops.length < 2) {
    setStatus("至少需要两个地点才能打开路线。", true);
    return;
  }

  const origin = formatStopForMapsUrl(usableStops[0]);
  const destination = formatStopForMapsUrl(usableStops[usableStops.length - 1]);
  const waypoints = usableStops
    .slice(1, -1)
    .slice(0, MAX_GOOGLE_MAPS_URL_WAYPOINTS)
    .map(formatStopForMapsUrl);
  const travelMode = googleMapsUrlMode(usableStops[0].travelModeToNext || state.itinerary.defaultTravelMode);

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  if (waypoints.length) {
    url.searchParams.set("waypoints", waypoints.join("|"));
  }
  url.searchParams.set("travelmode", travelMode);

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function handleJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  file
    .text()
    .then((text) => {
      state.editorSource = ITINERARY_SOURCES.local;
      els.editor.value = text;
      applyJsonFromEditor();
    })
    .catch((error) => {
      setStatus(`读取文件失败：${error.message}`, true);
    })
    .finally(() => {
      event.target.value = "";
    });
}

function downloadItinerary() {
  const jsonText = els.editorView.hidden ? JSON.stringify(state.itinerary, null, 2) : els.editor.value;
  let tripTitle = state.itinerary.tripTitle;

  try {
    tripTitle = JSON.parse(jsonText).tripTitle || tripTitle;
  } catch {
    // Invalid editor JSON can still be downloaded for manual recovery.
  }

  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(tripTitle)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyItineraryCode() {
  try {
    await navigator.clipboard.writeText(els.editor.value);
    showCopyFeedback("已复制");
  } catch {
    els.editor.focus();
    els.editor.select();
    const copied = document.execCommand("copy");
    showCopyFeedback(copied ? "已复制" : "复制失败");
    if (!copied) {
      setStatus("复制失败，请手动复制编辑框里的代码。", true);
    }
  }
}

function showCopyFeedback(label) {
  const originalLabel = "复制代码";
  els.copyJson.textContent = label;
  window.setTimeout(() => {
    els.copyJson.textContent = originalLabel;
  }, 1400);
}

function getVisibleDays() {
  if (state.selectedDayId === "all") {
    return state.itinerary.days;
  }
  return state.itinerary.days.filter((day) => day.id === state.selectedDayId);
}

function getSelectedDay() {
  if (state.selectedDayId === "all") return null;
  return state.itinerary.days.find((day) => day.id === state.selectedDayId) || null;
}

function getMapCenter() {
  return normalizeCoords(state.itinerary.map.center) || DEFAULT_ITINERARY.map.center;
}

function getStopCoords(stop) {
  return normalizeCoords(stop.coords) || normalizeCoords(stop.location);
}

function getStopUrlQuery(stop) {
  return stop.mapsQuery || stop.address || stop.place || stop.title;
}

function getStopMapsQuery(stop) {
  return getStopUrlQuery(stop) || formatStopForMapsUrl(stop);
}

function formatStopForMapsUrl(stop) {
  const query = getStopUrlQuery(stop);
  if (query) {
    return query;
  }

  const coords = getStopCoords(stop);
  if (coords) {
    return `${coords.lat},${coords.lng}`;
  }

  return "";
}

function getRouteCacheKey(day, originStop, destinationStop) {
  return window.TripRouteCache.getRouteCacheKey(day, originStop, destinationStop, state.itinerary.defaultTravelMode);
}

function shouldSkipRouteCalculation(originStop) {
  return window.TripRouteCache.isRouteCalculationSkipped(originStop, state.itinerary.defaultTravelMode);
}

function countStopsWithCoords(days) {
  return days.reduce((count, day) => count + day.stops.filter((stop) => getStopCoords(stop)).length, 0);
}

function isStopCurrent(day, stop) {
  if (!day.date || !stop.time) return false;

  const nowInTrip = getZonedDateParts(state.itinerary?.timezone || TRIP_CONFIG.timezone || "Asia/Tokyo");
  if (nowInTrip.date !== day.date) return false;

  const stopStart = parseClockMinutes(stop.time);
  if (stopStart === null) return false;

  const duration = parseDurationMinutes(stop.duration) || 60;
  const stopEnd = stopStart + duration;
  return nowInTrip.minutes >= stopStart && nowInTrip.minutes < stopEnd;
}

function updateTripClock() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: state.itinerary?.timezone || TRIP_CONFIG.timezone || "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  els.tripClock.textContent = `${getClockLabel()} ${formatter.format(new Date())}`;
  const selectedDay = getSelectedDay();
  const selectionChanged = Boolean(selectedDay && isDayPast(selectedDay));
  if (selectionChanged) {
    state.selectedDayId = "all";
  }
  renderPlan();
  if (selectionChanged && state.map) {
    void renderMapForSelection();
  }
}

function getZonedDateParts(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    minutes: Number(byType.hour) * 60 + Number(byType.minute),
  };
}

function parseClockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function parseDurationMinutes(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;

  const hourMatch = /(\d+(?:\.\d+)?)\s*h/.exec(text);
  const minuteMatch = /(\d+)\s*m/.exec(text);
  const cnHourMatch = /(\d+(?:\.\d+)?)\s*小时/.exec(text);
  const cnMinuteMatch = /(\d+)\s*分/.exec(text);
  const hours = Number(hourMatch?.[1] || cnHourMatch?.[1] || 0);
  const minutes = Number(minuteMatch?.[1] || cnMinuteMatch?.[1] || 0);
  const total = Math.round(hours * 60 + minutes);
  return total > 0 ? total : null;
}

function normalizeCoords(value) {
  if (!value || typeof value !== "object") return null;
  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude ?? value.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function normalizeTravelMode(value) {
  return window.TripRouteCache.normalizeTravelMode(value);
}

function normalizeStopType(value) {
  const type = String(value || "destination").trim().toLowerCase();
  const allowedTypes = new Set(["hotel", "station", "restaurant", "sight", "area", "destination"]);
  return allowedTypes.has(type) ? type : "destination";
}

function inferStopType(stop) {
  const title = String(stop.title || "").toLowerCase();
  const place = String(stop.place || "").toLowerCase();
  const notes = String(stop.notes || "").toLowerCase();
  const visibleText = [title, notes].filter(Boolean).join(" ");
  const stationPattern =
    /airport|terminal|flight|station|train|rail|railway|shinkansen|机场|機場|空港|航班|飞机|飛機|站|駅|新干线|新幹線/;

  if (/hotel|inn|hostel|motel|resort|onsen|酒店|大饭店|旅馆|旅店|民宿|温泉/.test(title)) return "hotel";
  if (/area|周边|自由日|最后一天|待定/.test(visibleText)) return "area";
  if (stationPattern.test(visibleText)) return "station";
  if (/restaurant|cafe|餐厅|咖啡|晚餐|午餐/.test(visibleText)) return "restaurant";
  if (/park|temple|shrine|castle|museum|公园|寺|神社|城|博物馆|中华街|港未来/.test(visibleText)) return "sight";
  if (/hotel|inn|onsen/.test(place)) return "hotel";
  return "destination";
}

function modeLabel(mode) {
  const labels = {
    DRIVING: "开车",
    WALKING: "步行",
    BICYCLING: "骑行",
    TRANSIT: "公共交通",
    TRAIN: "火车",
    SHINKANSEN: "新干线",
    FLIGHT: "飞机",
  };
  return labels[normalizeTravelMode(mode)];
}

function googleMapsUrlMode(mode) {
  const modes = {
    DRIVING: "driving",
    WALKING: "walking",
    BICYCLING: "bicycling",
    TRANSIT: "transit",
    TRAIN: "transit",
    SHINKANSEN: "transit",
    FLIGHT: "transit",
  };
  return modes[normalizeTravelMode(mode)] || "transit";
}

function createMarkerContent(number, color) {
  const pin = document.createElement("div");
  pin.className = "marker-pin";
  pin.style.background = color;
  pin.textContent = String(number);
  return pin;
}

function createLocationDot() {
  const dot = document.createElement("div");
  dot.className = "location-dot";
  return dot;
}

function syncEditorFromItinerary() {
  els.editor.value = JSON.stringify(state.itinerary, null, 2);
}

function activateItinerarySource(source, options = { persist: true }) {
  const isLocal = source === ITINERARY_SOURCES.local;
  if (isLocal && !state.localVersion) return false;

  state.activeSource = isLocal ? ITINERARY_SOURCES.local : ITINERARY_SOURCES.official;
  state.editorSource = state.activeSource;
  applyItinerary(isLocal ? state.localVersion.itinerary : state.defaultItinerary);

  if (options.persist !== false) {
    writeStoredValue(STORAGE_KEYS.activeSource, state.activeSource);
  }
  updateSourceUi();
  return true;
}

function handleSourceSwitch(event) {
  const button = event.target.closest("[data-itinerary-source]");
  if (!button) return;

  const source = button.dataset.itinerarySource;
  state.editorSource =
    source === ITINERARY_SOURCES.local ? ITINERARY_SOURCES.local : ITINERARY_SOURCES.official;

  if (!activateItinerarySource(state.editorSource)) {
    syncEditorFromSource();
    updateSourceUi();
    setStatus("还没有本地行程。切到本地后可以粘贴或导入 JSON，再点更新。");
  }
}

function syncEditorFromSource() {
  const itinerary =
    state.editorSource === ITINERARY_SOURCES.local
      ? state.localVersion?.itinerary || state.defaultItinerary
      : state.defaultItinerary;
  els.editor.value = JSON.stringify(itinerary, null, 2);
}

function updateSourceUi() {
  const isLocalActive = state.activeSource === ITINERARY_SOURCES.local;
  const isLocalEditor = state.editorSource === ITINERARY_SOURCES.local;

  els.sourceIndicator.textContent = isLocalActive ? "本地行程" : "官方行程";
  els.sourceIndicator.classList.toggle("local", isLocalActive);

  els.sourceSwitch.querySelectorAll("[data-itinerary-source]").forEach((button) => {
    const isActive = button.dataset.itinerarySource === state.editorSource;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (!isLocalEditor) {
    els.sourceDescription.textContent = "官方行程来自 GitHub Pages；这里只能下载或复制。";
  } else if (state.localVersion) {
    els.sourceDescription.textContent = `仅保存在这个浏览器 · ${formatLocalVersionTime(state.localVersion.savedAt)}`;
    els.applyJson.textContent = "更新";
  } else {
    els.sourceDescription.textContent = "尚未创建；可以粘贴或导入 JSON 后更新。";
    els.applyJson.textContent = "更新";
  }

  els.editor.readOnly = !isLocalEditor;
  els.applyJson.hidden = !isLocalEditor;
  els.downloadJson.textContent = "下载";
  els.copyJson.textContent = "复制代码";
  els.deleteLocalVersion.textContent = "删除";
  els.deleteLocalVersion.hidden = !isLocalEditor || !state.localVersion;
}

function loadLocalVersion() {
  const storedVersion = readStoredJson(STORAGE_KEYS.localVersion);
  if (storedVersion?.itinerary) {
    return storedVersion;
  }

  const legacyItinerary = readStoredJson(STORAGE_KEYS.legacyItinerary);
  if (!legacyItinerary) return null;

  return {
    itinerary: legacyItinerary,
    savedAt: "",
    migratedFromLegacy: true,
  };
}

function saveLocalVersion(itinerary) {
  const localVersion = {
    itinerary: clone(itinerary),
    savedAt: new Date().toISOString(),
  };
  if (!writeStoredValue(STORAGE_KEYS.localVersion, JSON.stringify(localVersion))) {
    return false;
  }
  state.localVersion = localVersion;
  removeStoredValue(STORAGE_KEYS.legacyItinerary);
  return true;
}

function deleteLocalVersion() {
  if (!window.confirm("删除这个浏览器里的本地行程？官方行程不会受影响。")) return;

  state.localVersion = null;
  removeStoredValue(STORAGE_KEYS.localVersion);
  removeStoredValue(STORAGE_KEYS.legacyItinerary);
  state.editorSource = ITINERARY_SOURCES.official;
  activateItinerarySource(ITINERARY_SOURCES.official);
  setStatus("本地行程已删除，当前显示官方行程。");
}

function readStoredJson(key) {
  const value = readStoredValue(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStoredValue(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStoredValue(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
}

function formatLocalVersionTime(value) {
  if (!value) return "由旧版浏览器缓存迁移";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "保存时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: state.itinerary?.timezone || TRIP_CONFIG.timezone || "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function slugify(value) {
  return String(value || "itinerary")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesConfigPattern(value, pattern) {
  if (!pattern) return false;
  return new RegExp(pattern, "i").test(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
