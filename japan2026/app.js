"use strict";

const STORAGE_KEYS = {
  itinerary: "japan2026-itinerary-map:itinerary:v2",
};

const DEFAULT_MAP_ID = "DEMO_MAP_ID";
const MAX_GOOGLE_MAPS_URL_WAYPOINTS = 9;
const DAY_COLORS = ["#0f766e", "#2563eb", "#c2410c", "#7c3aed", "#be123c", "#15803d"];
const UNBOXED_STOP_TYPES = new Set(["hotel", "station"]);

const DEFAULT_ITINERARY = {
  tripTitle: "日本 7 日样例行程",
  timezone: "Asia/Tokyo",
  defaultTravelMode: "TRANSIT",
  map: {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 11,
    mapId: DEFAULT_MAP_ID,
  },
  days: [
    {
      id: "tokyo-day-1",
      date: "2026-07-06",
      label: "Day 1 · 东京",
      color: "#0f766e",
      stops: [
        {
          id: "tokyo-station",
          time: "09:00",
          duration: "35m",
          title: "Tokyo Station",
          place: "Tokyo Station, Tokyo, Japan",
          coords: { lat: 35.681236, lng: 139.767125 },
          notes: "到达、寄存行李、买交通卡",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "sensoji",
          time: "10:15",
          duration: "1h 20m",
          title: "浅草寺",
          place: "Senso-ji, Tokyo, Japan",
          coords: { lat: 35.714765, lng: 139.796655 },
          notes: "仲见世通和雷门",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "ueno-park",
          time: "12:25",
          duration: "1h 35m",
          title: "上野公园",
          place: "Ueno Park, Tokyo, Japan",
          coords: { lat: 35.715625, lng: 139.774529 },
          notes: "午餐、散步、博物馆可选",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "teamlab-borderless",
          time: "15:15",
          duration: "2h",
          title: "teamLab Borderless",
          place: "teamLab Borderless, Azabudai Hills, Tokyo, Japan",
          coords: { lat: 35.660238, lng: 139.740087 },
          notes: "建议提前预约",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "shibuya-crossing",
          time: "18:40",
          duration: "1h 20m",
          title: "涩谷十字路口",
          place: "Shibuya Scramble Crossing, Tokyo, Japan",
          coords: { lat: 35.659487, lng: 139.700559 },
          notes: "晚饭、夜景、逛街",
        },
      ],
    },
    {
      id: "fuji-day-2",
      date: "2026-07-07",
      label: "Day 2 · 富士山河口湖",
      color: "#2563eb",
      stops: [
        {
          id: "shinjuku",
          time: "08:00",
          duration: "20m",
          title: "新宿站",
          place: "Shinjuku Station, Tokyo, Japan",
          coords: { lat: 35.690921, lng: 139.700258 },
          notes: "高速巴士或铁路出发",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "kawaguchiko-station",
          time: "10:05",
          duration: "25m",
          title: "河口湖站",
          place: "Kawaguchiko Station, Yamanashi, Japan",
          coords: { lat: 35.498236, lng: 138.768817 },
          notes: "买周游巴士票",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "lake-kawaguchi",
          time: "10:50",
          duration: "2h",
          title: "河口湖",
          place: "Lake Kawaguchi, Yamanashi, Japan",
          coords: { lat: 35.517094, lng: 138.751779 },
          notes: "湖边散步、午餐、看天气决定观景点",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "chureito-pagoda",
          time: "14:20",
          duration: "1h 30m",
          title: "新仓山浅间公园",
          place: "Chureito Pagoda, Fujiyoshida, Yamanashi, Japan",
          coords: { lat: 35.501287, lng: 138.801446 },
          notes: "经典富士山机位",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "shinjuku-return",
          time: "19:00",
          duration: "1h",
          title: "回到新宿",
          place: "Shinjuku Station, Tokyo, Japan",
          coords: { lat: 35.690921, lng: 139.700258 },
          notes: "晚餐或回酒店",
        },
      ],
    },
    {
      id: "kyoto-day-3",
      date: "2026-07-08",
      label: "Day 3 · 京都",
      color: "#c2410c",
      stops: [
        {
          id: "kyoto-station",
          time: "09:00",
          duration: "20m",
          title: "京都站",
          place: "Kyoto Station, Kyoto, Japan",
          coords: { lat: 34.985849, lng: 135.758766 },
          notes: "行李、交通卡、出发",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "fushimi-inari",
          time: "09:45",
          duration: "1h 45m",
          title: "伏见稻荷大社",
          place: "Fushimi Inari Taisha, Kyoto, Japan",
          coords: { lat: 34.96714, lng: 135.772672 },
          notes: "千本鸟居，早点去人少",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "nishiki-market",
          time: "12:15",
          duration: "1h 30m",
          title: "锦市场",
          place: "Nishiki Market, Kyoto, Japan",
          coords: { lat: 35.004917, lng: 135.764986 },
          notes: "午餐、小吃",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "kiyomizudera",
          time: "14:40",
          duration: "1h 40m",
          title: "清水寺",
          place: "Kiyomizu-dera, Kyoto, Japan",
          coords: { lat: 34.994856, lng: 135.785046 },
          notes: "二年坂三年坂一起逛",
          travelModeToNext: "WALKING",
        },
        {
          id: "gion",
          time: "17:10",
          duration: "1h 20m",
          title: "祇园",
          place: "Gion, Kyoto, Japan",
          coords: { lat: 35.003655, lng: 135.775036 },
          notes: "晚餐、鸭川散步",
        },
      ],
    },
    {
      id: "osaka-nara-day-4",
      date: "2026-07-09",
      label: "Day 4 · 大阪 / 奈良",
      color: "#7c3aed",
      stops: [
        {
          id: "namba",
          time: "09:00",
          duration: "30m",
          title: "难波站",
          place: "Namba Station, Osaka, Japan",
          coords: { lat: 34.663694, lng: 135.502165 },
          notes: "从酒店出发",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "osaka-castle",
          time: "10:00",
          duration: "1h 35m",
          title: "大阪城",
          place: "Osaka Castle, Osaka, Japan",
          coords: { lat: 34.687315, lng: 135.526201 },
          notes: "天守阁和公园",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "nara-park",
          time: "13:15",
          duration: "2h 30m",
          title: "奈良公园",
          place: "Nara Park, Nara, Japan",
          coords: { lat: 34.685087, lng: 135.843012 },
          notes: "东大寺、春日大社可选",
          travelModeToNext: "TRANSIT",
        },
        {
          id: "dotonbori",
          time: "18:30",
          duration: "1h 45m",
          title: "道顿堀",
          place: "Dotonbori, Osaka, Japan",
          coords: { lat: 34.668723, lng: 135.501297 },
          notes: "晚餐、夜景、购物",
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
  bindEvents();

  const configuredApiKey = getActiveApiKey();
  state.defaultItinerary = await loadDefaultItinerary();
  state.routeCacheMeta = await loadRouteCacheFile();
  const savedItinerary = parseJsonSafely(localStorage.getItem(STORAGE_KEYS.itinerary));
  applyItinerary(savedItinerary || state.defaultItinerary, { save: false });
  updateJapanClock();
  setInterval(updateJapanClock, 30000);

  if (configuredApiKey && shouldAutoLoadMap()) {
    void bootMap();
  } else if (configuredApiKey) {
    setStatus("行程已载入。地图会显示仓库里的路线缓存。");
  } else {
    setStatus("行程已载入。地图配置缺少 Google Maps API key。", true);
  }
}

function getLocalConfigApiKey() {
  return window.JAPAN_MAP_CONFIG?.apiKey || "";
}

function getActiveApiKey() {
  return getLocalConfigApiKey();
}

function shouldAutoLoadMap() {
  return window.JAPAN_MAP_CONFIG?.autoLoadMap !== false;
}

async function loadDefaultItinerary() {
  try {
    const response = await fetch("./itinerary.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    setStatus(`无法读取 itinerary.json，使用内建示例：${error.message}`, true);
    return DEFAULT_ITINERARY;
  }
}

async function loadRouteCacheFile() {
  try {
    const response = await fetch("./route-cache.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const parsed = await response.json();
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

function cacheElements() {
  els.topControls = document.querySelector(".trip-controls");
  els.editorToggle = document.querySelector("#editor-toggle");
  els.mobileTabs = document.querySelector(".mobile-view-tabs");
  els.mapView = document.querySelector("#map-view");
  els.editorView = document.querySelector("#editor-view");
  els.japanClock = document.querySelector("#japan-clock");
  els.dayTabs = document.querySelector("#day-tabs");
  els.timeline = document.querySelector("#timeline");
  els.editor = document.querySelector("#itinerary-json");
  els.applyJson = document.querySelector("#apply-json");
  els.downloadJson = document.querySelector("#download-json");
  els.copyJson = document.querySelector("#copy-json");
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
  els.jsonFile.addEventListener("change", handleJsonFile);
  els.openGoogleMaps.addEventListener("click", openSelectedDayInGoogleMaps);
  els.locateMe.addEventListener("click", toggleLiveLocation);
  els.dayTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-day-id]");
    if (!button) return;

    state.selectedDayId = state.selectedDayId === button.dataset.dayId ? "all" : button.dataset.dayId;
    renderPlan();
    if (state.map) {
      void renderMapForSelection();
    }
  });
  els.timeline.addEventListener("click", (event) => {
    const stopNode = event.target.closest("[data-stop-id]");
    if (!stopNode) return;
    openStopFromTimeline(stopNode.dataset.dayId, stopNode.dataset.stopId);
  });
  els.timeline.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const stopNode = event.target.closest("[data-stop-id]");
    if (!stopNode) return;
    event.preventDefault();
    openStopFromTimeline(stopNode.dataset.dayId, stopNode.dataset.stopId);
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
  try {
    const parsed = JSON.parse(els.editor.value);
    applyItinerary(parsed, { save: true });
    setStatus("行程已更新到当前浏览器。同步到 GitHub 后会重新生成路线缓存。");
  } catch (error) {
    setStatus(`JSON 解析失败：${error.message}`, true);
  }
}

function applyItinerary(rawItinerary, options = { save: true }) {
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

  if (options.save) {
    saveItinerary();
  }
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
  itinerary.tripTitle = itinerary.tripTitle || "日本行程";
  itinerary.timezone = itinerary.timezone || "Asia/Tokyo";
  itinerary.defaultTravelMode = normalizeTravelMode(itinerary.defaultTravelMode || "TRANSIT");
  itinerary.map = itinerary.map || {};
  itinerary.map.center = normalizeCoords(itinerary.map.center) || DEFAULT_ITINERARY.map.center;
  itinerary.map.zoom = Number.isFinite(Number(itinerary.map.zoom)) ? Number(itinerary.map.zoom) : 11;
  itinerary.map.mapId = itinerary.map.mapId || DEFAULT_MAP_ID;

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
    normalizedStop.travelModeToNext || day.defaultTravelMode || state.itinerary?.defaultTravelMode || "TRANSIT",
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
    const callbackName = "__japanItineraryMapLoaded";
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };

    const script = document.createElement("script");
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      `?key=${encodeURIComponent(apiKey)}` +
      "&v=weekly&loading=async" +
      "&language=zh-CN&region=JP" +
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

  saveItinerary();
  syncEditorFromItinerary();
}

function buildGeocodeQuery(stop, day) {
  const query = stop.place || stop.address || stop.title;
  if (/japan|日本/i.test(query)) {
    return query;
  }
  const cityHint = /东京|東京|tokyo/i.test(day.label)
    ? "Tokyo"
    : /京都|kyoto/i.test(day.label)
      ? "Kyoto"
      : /大阪|osaka/i.test(day.label)
        ? "Osaka"
        : "";
  return [query, cityHint, "Japan"].filter(Boolean).join(", ");
}

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    state.geocoder.geocode(
      {
        address,
        componentRestrictions: { country: "JP" },
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
        summaries.push(null);
        continue;
      }

      if (cachedRoute) {
        drawCachedRoute(cachedRoute, day.color);
        summaries.push({ ...cachedRoute.summary, cached: true });
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
    planned: true,
  };
}

function drawCachedRoute(routeCacheEntry, color) {
  const path = routeCacheEntry.path?.length ? routeCacheEntry.path : null;
  if (!path) return;

  if (routeCacheEntry.summary?.fallback) {
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
    fragment.appendChild(createDayTab(day.id, getDayTabLabel(day), state.selectedDayId === day.id));
  });

  els.dayTabs.replaceChildren(fragment);
}

function createDayTab(dayId, label, isActive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `day-tab${isActive ? " active" : ""}`;
  button.dataset.dayId = dayId;
  button.textContent = label;
  return button;
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
  const placeRules = [
    [/横滨|橫濱|yokohama/i, "横滨"],
    [/奈良|nara/i, "奈良"],
    [/宇治|uji/i, "宇治"],
    [/京都|岚山|嵐山|祇园|祇園|清水寺|伏见稻荷|伏見稻荷|kyoto|arashiyama/i, "京都"],
    [/名古屋|nagoya/i, "名古屋"],
    [/东京|東京|新宿|原宿|涩谷|澀谷|浅草|淺草|上野|秋叶原|秋葉原|中野|银座|銀座|tokyo|shinjuku|shibuya|akihabara/i, "东京"],
  ];
  const match = placeRules.find(([pattern]) => pattern.test(label));
  if (match) return match[1];

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

    const summaries = state.legSummariesByDay.get(day.id) || [];
    day.stops.forEach((stop, index) => {
      fragment.appendChild(createStopCard(day, stop));

      const summary = summaries[index];
      if (summary) {
        fragment.appendChild(createLegSummaryNode(summary));
      }
    });
  });

  els.timeline.replaceChildren(fragment);
}

function createStopCard(day, stop) {
  const card = document.createElement("article");
  const stopType = normalizeStopType(stop.type || inferStopType(stop));
  card.className = `stop-card stop-card--${stopType}${UNBOXED_STOP_TYPES.has(stopType) ? " stop-card--plain" : ""}${isStopCurrent(day, stop) ? " is-now" : ""}`;
  card.dataset.dayId = day.id;
  card.dataset.stopId = stop.id;
  card.tabIndex = 0;
  card.role = "link";
  card.title = "在 Google Maps 中打开";

  const time = document.createElement("div");
  time.className = "stop-time";
  time.textContent = stop.time || "--:--";

  const body = document.createElement("div");
  body.className = "stop-body";

  const title = document.createElement("h3");
  title.textContent = stop.title;

  const details = document.createElement("p");
  const detailParts = [stop.duration, stop.notes, stop.geocodeError].filter(Boolean);
  details.textContent = detailParts.join(" · ");

  body.append(title, details);
  card.append(time, body);
  return card;
}

function createLegSummaryNode(summary) {
  const node = document.createElement("div");
  node.className = `leg-summary${summary.fallback || summary.error ? " error" : ""}${summary.cached && !summary.fallback ? " cached" : ""}`;

  const connector = document.createElement("span");
  connector.textContent = "↓";

  const text = document.createElement("span");
  if (summary.error) {
    text.textContent = summary.error;
  } else if (summary.planned) {
    text.textContent = `${modeLabel(summary.travelMode)} · 未计算路线 · 显示计划连线`;
  } else if (summary.fallback) {
    text.textContent = `${modeLabel(summary.travelMode)} · ${summary.duration}`;
  } else {
    text.textContent = `${modeLabel(summary.travelMode)} · ${summary.duration} · ${summary.distance}`;
  }

  node.append(connector, text);
  return node;
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
  const blob = new Blob([JSON.stringify(state.itinerary, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(state.itinerary.tripTitle)}.json`;
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
  return stop.place || stop.address || stop.title;
}

function getStopMapsQuery(stop) {
  return stop.place || stop.address || stop.title || formatStopForMapsUrl(stop);
}

function formatStopForMapsUrl(stop) {
  const coords = getStopCoords(stop);
  if (coords) {
    return `${coords.lat},${coords.lng}`;
  }
  return getStopUrlQuery(stop);
}

function getRouteCacheKey(day, originStop, destinationStop) {
  return window.JapanRouteCache.getRouteCacheKey(day, originStop, destinationStop, state.itinerary.defaultTravelMode);
}

function shouldSkipRouteCalculation(originStop) {
  return window.JapanRouteCache.isRouteCalculationSkipped(originStop, state.itinerary.defaultTravelMode);
}

function countStopsWithCoords(days) {
  return days.reduce((count, day) => count + day.stops.filter((stop) => getStopCoords(stop)).length, 0);
}

function isStopCurrent(day, stop) {
  if (!day.date || !stop.time) return false;

  const nowInJapan = getZonedDateParts("Asia/Tokyo");
  if (nowInJapan.date !== day.date) return false;

  const stopStart = parseClockMinutes(stop.time);
  if (stopStart === null) return false;

  const duration = parseDurationMinutes(stop.duration) || 60;
  const stopEnd = stopStart + duration;
  return nowInJapan.minutes >= stopStart && nowInJapan.minutes < stopEnd;
}

function updateJapanClock() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  els.japanClock.textContent = `日本时间 ${formatter.format(new Date())}`;
  renderTimeline();
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
  return window.JapanRouteCache.normalizeTravelMode(value);
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

  if (/hotel|inn|onsen|酒店|大饭店|旅馆|温泉|花传抄|维亚/.test(title)) return "hotel";
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

function saveItinerary() {
  localStorage.setItem(STORAGE_KEYS.itinerary, JSON.stringify(state.itinerary));
}

function parseJsonSafely(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
