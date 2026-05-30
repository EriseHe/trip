# Trips

GitHub Pages trip hub. The root page lists available trips, and each trip lives in its own subdirectory.

## Pages

- Root trip list: `https://erisehe.github.io/trip/`
- Japan 2026 itinerary map: `https://erisehe.github.io/trip/japan2026/`
- Japan 2026 dates: June 25, 2026 to July 4, 2026

## Run Locally

```bash
cd /Users/erisehe/Documents/GitHub/trip
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173/
```

The Japan map is at:

```text
http://localhost:5173/japan2026/
```

## Add Another Trip

Create a new subdirectory next to `japan2026`, copy the map app files or add a new page, then add one card to the root `index.html`.

To update Japan 2026, edit `japan2026/itinerary.json`. The app loads that file first, and the in-browser itinerary editor can still override it for quick experiments.

The editor is in the separate `编辑行程` tab inside the Japan page. The map tab does not show raw JSON.

## Route Cache

The Japan page reads precomputed routes from `japan2026/route-cache.json`. It does not call Directions while normal visitors load the map.

Regenerate the cache after changing `japan2026/itinerary.json`:

```bash
npm install
npm run precompute:japan2026
```

The GitHub Action in `.github/workflows/precompute-route-cache.yml` runs the same command when itinerary files change and commits the regenerated `route-cache.json` back to `main`.

Google Maps can show Japan transit routes in the consumer app while the Maps JavaScript Directions service still returns `ZERO_RESULTS`. When that happens, the generator stores a road-route estimate and marks that leg as approximate instead of leaving a straight line.

## Google API Setup

The Japan map reads its Google Maps key from `japan2026/config.js`. In Google Cloud Console, enable:

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

If the map shows `RefererNotAllowedMapError`, add the relevant URL above to `APIs & Services > Credentials > API key > Application restrictions > HTTP referrers`, save, then wait a minute and refresh.

By default, the map only loads markers and precomputed `route-cache.json` paths. It does not call Directions on page load.

## Itinerary Format

Each stop should include:

- `time`: local time, for example `09:00`
- `title`: display name
- `place`: Google-recognized place name
- `coords`: `{ "lat": 35.681236, "lng": 139.767125 }`
- `travelModeToNext`: `TRANSIT`, `WALKING`, `DRIVING`, or `BICYCLING`

If `coords` is missing, the app can try to geocode `place` or `title`, but explicit coordinates are more reliable.
