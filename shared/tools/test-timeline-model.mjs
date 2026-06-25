import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { buildTimelineBlocks } = require("../timeline-model.js");

const japan = JSON.parse(await readFile(new URL("../../japan2026/itinerary.json", import.meta.url), "utf8"));
const korea = JSON.parse(await readFile(new URL("../../korea2026/itinerary.json", import.meta.url), "utf8"));

testAsakusaTimeline();
testDetailedTransport();
testCompactTransport();
testTransportDisplayOverride();

console.log("Timeline model tests passed.");

function testAsakusaTimeline() {
  const day = japan.days.find((candidate) => candidate.date === "2026-06-26");
  const blocks = buildTimelineBlocks(day, createSummaries(day), {
    defaultTravelMode: japan.defaultTravelMode,
  });

  assert.deepEqual(getBlockTitles(blocks, "11:00"), ["新宿站"]);
  assert.deepEqual(getBlockTitles(blocks, "12:00"), ["浅草站", "浅草文化观光中心 8F 展望台"]);
  assert.match(blocks.find((block) => block.time === "12:00").items[0].mapsQuery, /浅草站/);

  const departureBlock = blocks.find((block) => block.time === "11:00");
  assert.equal(departureBlock.connectionToNext.mode, "TRANSIT");
  assert.equal(departureBlock.connectionToNext.detailed, false);
  assert.equal(departureBlock.connectionToNext.note, "");
}

function testDetailedTransport() {
  const shinkansenDay = japan.days.find((candidate) => candidate.date === "2026-06-28");
  const shinkansenBlocks = buildTimelineBlocks(shinkansenDay, createSummaries(shinkansenDay), {
    defaultTravelMode: japan.defaultTravelMode,
  });
  const tokyoDeparture = shinkansenBlocks.find((block) => block.time === "10:20");
  assert.deepEqual(getBlockTitles(shinkansenBlocks, "10:20"), ["东京站"]);
  assert.equal(tokyoDeparture.connectionToNext.detailed, true);
  assert.match(tokyoDeparture.connectionToNext.note, /东海道新干线/);

  const flightDay = korea.days.find((candidate) => candidate.date === "2026-06-23");
  const flightBlocks = buildTimelineBlocks(flightDay, createSummaries(flightDay), {
    defaultTravelMode: korea.defaultTravelMode,
  });
  const flightDeparture = flightBlocks.find((block) => block.time === "10:45");
  assert.equal(flightDeparture.connectionToNext.mode, "FLIGHT");
  assert.equal(flightDeparture.connectionToNext.detailed, true);
  assert.match(flightDeparture.connectionToNext.note, /OZ363/);
}

function testCompactTransport() {
  const day = japan.days.find((candidate) => candidate.date === "2026-06-26");
  const summaries = createSummaries(day);
  const blocks = buildTimelineBlocks(day, summaries, {
    defaultTravelMode: japan.defaultTravelMode,
  });
  const walkingConnection = blocks.find((block) => block.time === "09:30").connectionToNext;
  assert.equal(walkingConnection.mode, "WALKING");
  assert.equal(walkingConnection.detailed, false);
  assert.equal(walkingConnection.note, "");
}

function testTransportDisplayOverride() {
  const day = {
    stops: [
      {
        id: "origin",
        time: "09:00",
        title: "Origin",
        travelModeToNext: "TRANSIT",
        transportDisplay: "detailed",
        transportNote: "Reserved express service.",
      },
      { id: "destination", time: "10:00", title: "Destination" },
    ],
  };
  const blocks = buildTimelineBlocks(day, createSummaries(day), { defaultTravelMode: "DRIVING" });
  assert.equal(blocks[0].connectionToNext.detailed, true);
  assert.equal(blocks[0].connectionToNext.note, "Reserved express service.");
}

function createSummaries(day) {
  return day.stops.slice(0, -1).map((stop, index) => ({
    fromStopId: stop.id,
    toStopId: day.stops[index + 1].id,
    travelMode: stop.travelModeToNext,
    duration: stop.travelDurationToNext || "10 分钟",
    distance: "1 公里",
  }));
}

function getBlockTitles(blocks, time) {
  return blocks.find((block) => block.time === time)?.items.map((item) => item.title) || [];
}
