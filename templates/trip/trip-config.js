window.TRIP_PLANNER_CONFIG = {
  id: "newtrip",
  documentTitle: "Trip Itinerary Map",
  eyebrow: "Trip planner",
  title: "New Trip · dates",
  clockLabel: "当地时间",
  timezone: "Asia/Tokyo",
  timezoneOffset: "+09:00",
  map: {
    autoLoadMap: true,
    language: "zh-CN",
    region: "JP",
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 11,
  },
  routing: {
    unavailableModes: [],
  },
  geocode: {
    countryCode: "JP",
    defaultCountry: "Japan",
    defaultCity: "Tokyo",
    countryTerms: ["japan", "日本"],
    cityHints: [{ pattern: "tokyo|东京|東京", city: "Tokyo" }],
  },
  dayTabPlaces: [{ pattern: "tokyo|东京|東京", label: "东京" }],
};
