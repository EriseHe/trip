"use strict";

(function attachTimelineModel(global, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  global.TripTimelineModel = api;
})(typeof globalThis === "object" ? globalThis : this, function createTimelineModelApi() {
  const DETAILED_MODES = new Set(["TRAIN", "SHINKANSEN", "FLIGHT"]);
  const MODE_ALIASES = {
    AIRPLANE: "FLIGHT",
    BULLET_TRAIN: "SHINKANSEN",
    HIGH_SPEED_RAIL: "SHINKANSEN",
    HIGH_SPEED_TRAIN: "SHINKANSEN",
    PLANE: "FLIGHT",
    RAIL: "TRAIN",
    RAILWAY: "TRAIN",
  };

  function buildTimelineBlocks(day, summaries = [], options = {}) {
    const defaultTravelMode = options.defaultTravelMode || "DRIVING";
    const blocksByTime = new Map();
    const legs = [];

    day.stops.forEach((stop, stopIndex) => {
      addItem(blocksByTime, stop.time, createStopItem(stop, stopIndex));
    });

    day.stops.slice(0, -1).forEach((originStop, index) => {
      const destinationStop = day.stops[index + 1];
      const summary = summaries[index] || createPlannedSummary(originStop, destinationStop, defaultTravelMode);
      const mode = normalizeMode(summary.travelMode || originStop.travelModeToNext || defaultTravelMode);
      const departureTime = originStop.departAt || originStop.time;
      const arrivalTime = originStop.arriveAt || destinationStop.time;

      if (originStop.transportFrom) {
        addTransportItem(blocksByTime, departureTime, {
          id: `${originStop.id}-transport-departure`,
          title: originStop.transportFrom,
          mapsQuery: originStop.transportFromMapsQuery || originStop.transportFrom,
          phase: "departure",
        });
      }
      if (originStop.transportTo) {
        addTransportItem(blocksByTime, arrivalTime, {
          id: `${originStop.id}-transport-arrival`,
          title: originStop.transportTo,
          mapsQuery: originStop.transportToMapsQuery || originStop.transportTo,
          phase: "arrival",
        });
      }

      legs.push({
        id: `${originStop.id}-to-${destinationStop.id}`,
        fromTime: originStop.transportFrom ? departureTime : originStop.time,
        toTime: originStop.transportTo ? arrivalTime : destinationStop.time,
        mode,
        detailed: getTransportDisplay(originStop, mode) === "detailed",
        note: originStop.transportNote || "",
        summary,
        originStop,
        destinationStop,
      });
    });

    const blocks = [...blocksByTime.values()]
      .sort(compareBlocks)
      .map((block) => ({
        ...block,
        items: block.items.sort(compareItems),
        connectionToNext: null,
      }));
    const blockIndexByTime = new Map(blocks.map((block, index) => [block.time, index]));

    legs.forEach((leg) => {
      const fromIndex = blockIndexByTime.get(leg.fromTime);
      const toIndex = blockIndexByTime.get(leg.toTime);
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || toIndex <= fromIndex) return;

      for (let index = fromIndex; index < toIndex; index += 1) {
        blocks[index].connectionToNext = {
          ...leg,
          showDetails: index === fromIndex,
          continuation: index > fromIndex,
        };
      }
    });

    return blocks;
  }

  function createStopItem(stop, stopIndex) {
    return {
      id: stop.id,
      kind: "stop",
      order: 10,
      stopIndex,
      stop,
      stopId: stop.id,
      title: stop.title,
      type: stop.type,
      duration: stop.duration || "",
      notes: stop.notes || "",
      mapsQuery: stop.mapsQuery || stop.address || stop.place || stop.title,
    };
  }

  function addTransportItem(blocksByTime, time, item) {
    const block = getOrCreateBlock(blocksByTime, time);
    const duplicate = block.items.some(
      (candidate) => normalizeTitle(candidate.title) === normalizeTitle(item.title),
    );
    if (duplicate) return;

    block.items.push({
      ...item,
      kind: "transport",
      order: item.phase === "arrival" ? 0 : 20,
      type: "station",
      synthetic: true,
    });
  }

  function addItem(blocksByTime, time, item) {
    getOrCreateBlock(blocksByTime, time).items.push(item);
  }

  function getOrCreateBlock(blocksByTime, time) {
    const normalizedTime = String(time || "").trim() || "--:--";
    if (!blocksByTime.has(normalizedTime)) {
      blocksByTime.set(normalizedTime, {
        time: normalizedTime,
        sortMinutes: parseClockMinutes(normalizedTime),
        items: [],
      });
    }
    return blocksByTime.get(normalizedTime);
  }

  function getTransportDisplay(stop, mode) {
    const override = String(stop.transportDisplay || "").trim().toLowerCase();
    if (override === "compact" || override === "detailed") return override;
    return DETAILED_MODES.has(mode) ? "detailed" : "compact";
  }

  function createPlannedSummary(originStop, destinationStop, defaultTravelMode) {
    return {
      fromStopId: originStop.id,
      toStopId: destinationStop.id,
      travelMode: normalizeMode(originStop.travelModeToNext || defaultTravelMode),
      duration: originStop.travelDurationToNext || "未计算",
      distance: "计划连线",
      planned: true,
    };
  }

  function compareBlocks(left, right) {
    if (left.sortMinutes === null) return 1;
    if (right.sortMinutes === null) return -1;
    return left.sortMinutes - right.sortMinutes;
  }

  function compareItems(left, right) {
    if (left.order !== right.order) return left.order - right.order;
    return Number(left.stopIndex || 0) - Number(right.stopIndex || 0);
  }

  function normalizeMode(value) {
    const mode = String(value || "DRIVING").trim().toUpperCase();
    return MODE_ALIASES[mode] || mode;
  }

  function normalizeTitle(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function parseClockMinutes(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  return {
    buildTimelineBlocks,
    getTransportDisplay,
  };
});
