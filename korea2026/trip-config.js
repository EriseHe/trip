window.TRIP_PLANNER_CONFIG = {
  id: "korea2026",
  documentTitle: "Korea Live Itinerary Map",
  eyebrow: "Korea trip planner",
  title: "韩国2026 · 6/20 - 6/23",
  clockLabel: "韩国时间",
  timezone: "Asia/Seoul",
  timezoneOffset: "+09:00",
  map: {
    autoLoadMap: true,
    language: "zh-CN",
    region: "KR",
    center: { lat: 37.5665, lng: 126.978 },
    zoom: 11,
  },
  geocode: {
    countryCode: "KR",
    defaultCountry: "South Korea",
    defaultCity: "Seoul",
    countryTerms: ["korea", "south korea", "韩国", "韓國", "首尔", "首爾", "仁川"],
    cityHints: [
      { pattern: "仁川|incheon|icn", city: "Incheon" },
      { pattern: "上海|shanghai|pvg", city: "Shanghai" },
      { pattern: "首尔|首爾|明洞|南山|弘大|圣水|聖水|江南|广藏|廣藏|梨泰院|汉江|漢江|seoul|myeongdong|hongdae|seongsu|gangnam", city: "Seoul" },
    ],
  },
  dayTabPlaces: [
    { pattern: "仁川|incheon|icn", label: "仁川" },
    { pattern: "首尔|首爾|明洞|南山|弘大|圣水|聖水|江南|广藏|廣藏|梨泰院|汉江|漢江|seoul|myeongdong|hongdae|seongsu|gangnam", label: "首尔" },
    { pattern: "上海|shanghai|pvg", label: "上海" },
  ],
};
