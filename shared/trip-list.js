"use strict";

const grid = document.querySelector("#trip-grid");

fetch("./trips.json", { cache: "no-cache" })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => renderTrips(Array.isArray(data.trips) ? data.trips : []))
  .catch((error) => {
    grid.textContent = `无法读取 trips.json：${error.message}`;
  });

function renderTrips(trips) {
  const fragment = document.createDocumentFragment();
  trips.forEach((trip) => fragment.appendChild(createTripCard(trip)));
  grid.replaceChildren(fragment);
}

function createTripCard(trip) {
  const card = document.createElement("a");
  card.className = "trip-card";
  card.href = trip.href || `./${trip.id}/`;

  const content = document.createElement("div");
  const meta = document.createElement("p");
  meta.className = "trip-meta";
  meta.textContent = trip.meta || "Trip";

  const title = document.createElement("h2");
  title.textContent = trip.title || trip.id || "Trip";

  const description = document.createElement("p");
  description.textContent = trip.description || "Open itinerary map.";

  const openLabel = document.createElement("span");
  openLabel.className = "open-label";
  openLabel.textContent = trip.openLabel || "Open map";

  content.append(meta, title, description);
  card.append(content, openLabel);
  return card;
}
