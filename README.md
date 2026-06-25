# Trips

GitHub Pages trip hub. The root page reads `trips.json`, and every trip page uses the same shared planner in `shared/`.

## Structure

- `index.html` renders the trip list.
- `site-config.js` stores repo-wide settings such as the shared Google Maps API key.
- `trips.json` is the trip manifest for the homepage and route-cache workflow.
- `shared/planner.js` and `shared/planner.css` are the reusable itinerary UI.
- `shared/route-cache.js` contains route helper logic shared by the app and generator.
- `shared/tools/precompute-routes.*` generates route-cache files for one or all trips.
- `templates/trip/` is the starter folder for a new trip.
- Each trip folder keeps only trip-specific files: `index.html`, `trip-config.js`, `itinerary.json`, and `route-cache.json`.

## Pages

- Root trip list: `https://erisehe.github.io/trip/`
- Japan 2026: `https://erisehe.github.io/trip/japan2026/`
- Korea 2026: `https://erisehe.github.io/trip/korea2026/`

## Run Locally

```bash
cd /Users/erisehe/Documents/GitHub/trip
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173/
```

## Add A Trip

Copy the reusable template:

```bash
cp -R templates/trip newtripid
```

Then update:

1. `newtripid/trip-config.js`: trip id, title, timezone/timezone offset, map center, region, geocode defaults, and day-tab labels.
2. `newtripid/itinerary.json`: dates, stops, coordinates, stop types, and `travelModeToNext`.
3. `trips.json`: add one card so the new trip appears on the homepage.

Use the same `index.html` from the template unless the shared page shell itself needs to change for every trip.

## Route Cache

Normal visitors read precomputed routes from each trip's `route-cache.json`; the page does not call Directions on load.

Regenerate every trip:

```bash
npm install
npm run precompute:all
```

Regenerate one trip:

```bash
npm run routes:cache -- japan2026
npm run routes:cache -- korea2026
```

The GitHub Action in `.github/workflows/precompute-route-cache.yml` runs the shared generator after itinerary/config/shared-code changes and commits updated `*/route-cache.json` files back to `main`.

`TRAIN`, `SHINKANSEN`, and `FLIGHT` are intentionally skipped by the route generator. The planner renders those modes as detailed vertical transport segments; `WALKING`, `DRIVING`, and `TRANSIT` stay compact unless `transportDisplay` overrides the default.

The generator merges consecutive `WALKING` or `DRIVING` legs within the same day into one Directions request with waypoints, up to 25 intermediate waypoints. If that grouped request fails, each leg in the group gets a fallback line and the generator does not retry with another departure time or travel mode.

For countries where Google does not provide a route mode, list it in `trip-config.js` under `routing.unavailableModes`. Those legs use cached straight-line distance/time estimates and make no Directions API request. Korea currently uses this for `DRIVING` and `WALKING`.

## Google API Setup

Trips read the shared key from `site-config.js`; a trip can still override it with `map.apiKey` in `trip-config.js`. In Google Cloud Console, enable:

- Maps JavaScript API
- Directions API (Legacy), only needed by the route-cache generator
- Geocoding API, optional unless a stop is missing `coords`

For GitHub Pages, restrict the key to:

```text
https://erisehe.github.io/*
```

For local testing, also allow:

```text
http://localhost:5173/*
```

By default, the map loads markers and precomputed `route-cache.json` paths. It does not call Directions on page load.

## Itinerary Format

Each stop should include:

- `time`: local time, for example `09:00`
- `title`: display name
- `place`: Google-recognized place name
- `coords`: `{ "lat": 35.681236, "lng": 139.767125 }`
- `type`: `hotel`, `station`, `restaurant`, `sight`, `area`, or `destination`
- `travelModeToNext`: `WALKING`, `DRIVING`, `BICYCLING`, `TRANSIT`, `TRAIN`, `SHINKANSEN`, or `FLIGHT`
- `travelDurationToNext`: optional fallback travel time shown when the route API returns no result
- `departAt` / `arriveAt`: optional transport endpoint times used to create separate timeline blocks
- `transportFrom` / `transportTo`: optional station or airport subitems shown at the endpoint blocks
- `transportFromMapsQuery` / `transportToMapsQuery`: optional Google Maps queries for synthetic endpoint subitems
- `transportNote`: optional note shown only on a detailed transport segment
- `transportDisplay`: optional `compact` or `detailed` override

If `coords` is missing, the app can try to geocode `place` or `title`, but explicit coordinates are more reliable.
