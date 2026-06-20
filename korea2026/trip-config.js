window.TRIP_PLANNER_CONFIG = {
  id: "korea2026",
  documentTitle: "Seoul 2026 Itinerary Map",
  eyebrow: "Korea trip planner",
  title: "韩国首尔 2026 · 6/20 - 6/23",
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
      { pattern: "首尔|首爾|明洞|南山|弘大|圣水|聖水|江南|广藏|廣藏|梨泰院|汉江|漢江|景福宫|景福宮|北村|仁寺洞|安国|安國|东大门|東大門|首尔森林|首爾森林|汉南|漢南|清溪川|昌德宫|昌德宮|后苑|後苑|宗庙|宗廟|seoul|myeongdong|hongdae|seongsu|gangnam|insadong|jonggak", city: "Seoul" },
    ],
  },
  dayTabPlaces: [
    { pattern: "仁川|incheon|icn", label: "仁川" },
    { pattern: "首尔|首爾|明洞|南山|弘大|圣水|聖水|江南|广藏|廣藏|梨泰院|汉江|漢江|景福宫|景福宮|北村|仁寺洞|安国|安國|东大门|東大門|首尔森林|首爾森林|汉南|漢南|清溪川|昌德宫|昌德宮|后苑|後苑|宗庙|宗廟|seoul|myeongdong|hongdae|seongsu|gangnam|insadong|jonggak", label: "首尔" },
    { pattern: "上海|shanghai|pvg", label: "上海" },
  ],
};
