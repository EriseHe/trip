# Japan Live Itinerary Map

一个本地运行的 Google Maps 行程地图工具：编辑 JSON 行程后，可以在地图上显示每天的地点、路线、每段交通时间，并打开 Google Maps 路线。

## 运行

```bash
cd /Users/erisehe/Downloads/Miscellaneous/japan-itinerary-map
python3 -m http.server 5173
```

然后打开：

```text
http://localhost:5173
```

GitHub Pages 部署后，项目页面通常是：

```text
https://erisehe.github.io/japan-itinerary-map/
```

页面会自动读取 `config.js` 里的 API key 并加载地图。没有这个文件时，仍然可以在页面右上角手动输入 key。

## Google API 设置

在 Google Cloud Console 里创建 API key，并启用：

- Maps JavaScript API
- Directions API (Legacy)
- Geocoding API（可选；只有当行程地点没有 `coords`、需要自动补坐标时才需要）

建议给 key 加 HTTP referrer 限制：

```text
http://localhost:5173/*
```

如果之后部署到自己的域名，也把对应域名加入 referrer 白名单。

如果页面提示 `RefererNotAllowedMapError`，说明当前 key 没有授权这个本地地址。到 Google Cloud Console 的 `APIs & Services > Credentials > API key > Application restrictions`，把上面的 `http://localhost:5173/*` 加进去并保存，等一两分钟后刷新页面。

## 行程格式

每个 stop 至少建议包含：

- `time`: 当天时间，例如 `09:00`
- `title`: 显示名称
- `place`: Google 可识别的地点名
- `coords`: `{ "lat": 35.681236, "lng": 139.767125 }`
- `travelModeToNext`: 到下一个地点的方式，支持 `TRANSIT`、`WALKING`、`DRIVING`、`BICYCLING`

如果没有 `coords`，应用会尝试用 `place` 或 `title` 在日本范围内 geocode，但手动写坐标最稳定。

`itinerary.sample.json` 是一个更短的导入样例；应用内自带的是四天日本示例行程。

## 说明

如果你手动输入 API key，它只保存在当前浏览器的 `localStorage`。当前项目使用 tracked 的 `config.js`，适合部署到 GitHub Pages；请确保这个 key 已经限制到你的 GitHub Pages 域名并设置好 API restrictions 和 budget alert。路线时间由 Google Directions Service 在页面加载或切换日期时实时请求，所以会消耗 Google Maps Platform 配额。
