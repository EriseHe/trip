"use strict";

const list = document.querySelector("#trip-list");

fetch("./trips.json", { cache: "no-cache" })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => renderTrips(Array.isArray(data.trips) ? data.trips : []))
  .catch((error) => {
    list.textContent = `无法读取 trips.json：${error.message}`;
  });

function renderTrips(trips) {
  if (trips.length === 0) {
    const empty = document.createElement("p");
    empty.className = "trip-empty";
    empty.textContent = "No trips yet.";
    list.replaceChildren(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  groupTripsByYear(trips).forEach(({ year, trips: yearTrips }) => {
    fragment.appendChild(createYearSection(year, yearTrips));
  });
  list.replaceChildren(fragment);
}

function groupTripsByYear(trips) {
  const groups = new globalThis.Map();
  trips.forEach((trip, index) => {
    const year = getTripYear(trip);
    const entry = { ...trip, order: Number(trip.order ?? index) };
    groups.set(year, [...(groups.get(year) || []), entry]);
  });

  return [...groups.entries()]
    .sort(([leftYear], [rightYear]) => Number(rightYear) - Number(leftYear))
    .map(([year, yearTrips]) => ({
      year,
      trips: yearTrips.sort((left, right) => left.order - right.order),
    }));
}

function createYearSection(year, trips) {
  const section = document.createElement("section");
  section.className = "trip-year";

  const heading = document.createElement("h2");
  heading.textContent = `${year} 年`;

  const links = document.createElement("ul");
  links.className = "trip-links";
  trips.forEach((trip) => links.appendChild(createTripLink(trip)));

  section.append(heading, links);
  return section;
}

function createTripLink(trip) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = trip.href || `./${trip.id}/`;

  const name = document.createElement("span");
  name.className = "trip-name";
  name.textContent = getTripName(trip);
  link.appendChild(name);

  const dates = getTripDates(trip);
  if (dates) {
    const date = document.createElement("span");
    date.className = "trip-dates";
    date.textContent = dates;
    link.appendChild(date);
  }

  item.append(link);
  return item;
}

function getTripYear(trip) {
  const yearText = String(trip.year || trip.meta || trip.title || trip.id || "");
  return yearText.match(/\b(20\d{2})\b/)?.[1] || "Trips";
}

function getTripName(trip) {
  if (trip.name) return trip.name;
  return String(trip.title || trip.id || "Trip").replace(/\s*20\d{2}\s*$/, "");
}

function getTripDates(trip) {
  return trip.dates || String(trip.meta || "").replace(/\b20\d{2}\s*·\s*/, "");
}
