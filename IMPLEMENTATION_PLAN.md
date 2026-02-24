# Plant Care Mini-Game — Implementation Plan

## Current Status

| Step | File | Status |
|------|------|--------|
| 0 | IMPLEMENTATION_PLAN.md | ✅ Done |
| 1 | `src/constants/plants.mjs` | ✅ Created — **needs pivot** (see below) |
| 2 | `src/services/homeAssistant.mjs` | ✅ Done (device-based discovery, validated) |
| 2.5 | `src/ha-test.html` + `src/ha-test.mjs` | ✅ Done (real-time + 24h history confirmed working) |
| 3 | `src/services/plantData.mjs` | ✅ Done |
| 4 | Routes + `EarnCoins.mjs` + `Home.mjs` | ⏳ Pending |
| 5 | `src/pages/Plants.mjs` | ⏳ Pending |

---

## Overview

Add a plants mini-game to Dogstagram where the player's real houseplants (monitored via Home Assistant) become interactive characters. Physical actions the player takes on their plants (watering, moving into or out of sunlight) are detected automatically from sensor changes and reward coins. Petting a plant is the only manual in-app action.

---

## Navigation changes

- **"Earn Coins"** on the Home screen currently goes directly to the dog Feed page.
- It will instead go to a new **EarnCoins** choice screen with two options:
  - **"See Dogs"** → existing Feed page (unchanged)
  - **"PLANTS!"** → new Plants page
- The Plants page opens on a default room and has a map icon to switch rooms.

---

## New pages / files

### `src/constants/plants.mjs` (needs update)

Static configuration for this specific household — no runtime dependencies. The file is intentionally hardcoded for a single user's setup; the generic catch-all approach (substring pattern matching against any entity ID) has been replaced with explicit named mappings. Unknown HA areas fall back to the `other` room; unknown plant device names fall back to the default entry.

**Rooms** — keyed by room ID:
```js
export const KNOWN_ROOMS = {
    living_room: {
        name: 'Living Room',
        haAreaNames: ['Living Room'],      // exact HA area names that map here
        wallColour: '#c8b89a',
        floorColour: '#8b7355',
        accentColour: '#d4a76a',
    },
    bedroom: { ... },
    kitchen: { ... },
    // ... add actual rooms as needed
    other: { name: 'Other', haAreaNames: [], wallColour: '#d0ccc8', floorColour: '#8c8884', accentColour: '#b8b4b0' },
};
```

**Plants** — keyed by lowercase substring of the HA device friendly name:
```js
export const KNOWN_PLANTS = {
    'monstera deliciosa': {
        displayName:        'Monstera',
        emoji:              '🌿',
        size:               'large',
        openPlantbookPid:   'monstera deliciosa',   // exact OpenPlantbook pid
    },
    'pothos': {
        displayName:        'Pothos',
        emoji:              '🍃',
        size:               'medium',
        openPlantbookPid:   'epipremnum aureum',
    },
    // ... add actual plants keyed by their HA device name substrings
};

export const DEFAULT_PLANT = {
    displayName: 'Plant',
    emoji: '🪴',
    size: 'medium',
    openPlantbookPid: null,   // no OpenPlantbook lookup for unknowns
};
```

**Helpers:**
```js
export function resolveRoomKey(areaName)     // matches haAreaNames arrays → roomKey, falls back to 'other'
export function resolvePlant(friendlyName)   // matches KNOWN_PLANTS keys → plant entry, falls back to DEFAULT_PLANT
```

> **Note:** `resolveRoomKey` still uses partial/case-insensitive matching against each room's `haAreaNames` array. `resolvePlant` matches against the HA device friendly name (e.g. `"Bedroom Monstera"` matches key `'monstera'`), not against sensor entity IDs.

---

### `src/services/homeAssistant.mjs` ✅

Core HA WebSocket service. All state exposed as Vue `ref()`s.

> **Setup context:** Plant sensors use the **Xiaomi BLE** integration, creating individual `sensor.*` entities (moisture, temperature, illuminance, conductivity) grouped by `device_id`. There are **no** `plant.*` helper entities — plants are discovered entirely from the device registry. All WebSocket message formats have been validated against the live API.

**Persisted config (localStorage):**
- `haUrl` — e.g. `http://192.168.1.x:8123`
- `haToken` — long-lived access token
- `plantbookUrl` — optional OpenPlantbook proxy URL (see OpenPlantbook section below)

**Reactive state:**
- `haConnected` — WebSocket auth succeeded
- `haAvailable` — at least one successful bootstrap this session
- `haError` — human-readable error string

**Reactive data:**
- `plantStates` — `{ [deviceId]: { entity_id: deviceId, state: null, attributes: { friendly_name } } }` — synthetic state objects keyed by device ID
- `plantAreaNames` — `{ [deviceId]: area name string | null }`
- `linkedSensorIds` — `{ [deviceId]: string[] }` — all `sensor.*` entity IDs sharing that device
- `plantSensorValues` — `{ [deviceId]: { moisture, temperature, illuminance, conductivity } }` — live numeric readings

**Connection flow (implemented):**
1. Open WebSocket to `ws://<haUrl>/api/websocket`
2. Respond to `auth_required` with `{ type: "auth", access_token }`
3. On `auth_ok`: four parallel bootstrap requests — `get_states`, `config/entity_registry/list`, `config/area_registry/list`, `config/device_registry/list`
4. Bootstrap:
   - Group `sensor.*` entities by `device_id` from entity registry
   - Classify each sensor as moisture/temperature/illuminance/conductivity via `device_class` attribute, then entity ID pattern fallback
   - Treat devices with at least one moisture **or** illuminance sensor as plants
   - Resolve area: entity-level `area_id` (on primary sensor) → device-level `area_id` → `areaIdToName` → `plantAreaNames`
   - Build `sensorToPlant = { [sensorEntityId]: { plantId: deviceId, sensorType } }` for event routing
5. Fetch 24h history for all linked sensor entity IDs → emit `haEvents.emit('history', { historyData, sensorToPlant })`
6. Subscribe to `state_changed` events
7. Auto-reconnect after 10 s on disconnect

**History response format (confirmed):**
HA compressed history: `{ [entityId]: [{ s: '15.2', lu: 1771830593.927, a: { ... } }] }`
- `s` — state value (string, parse with `parseFloat`)
- `lu` — `last_updated` as Unix seconds float → multiply by 1000 for milliseconds
- All timestamps stored as **milliseconds** throughout (real-time: `Date.parse(new_state.last_changed)`, history: `lu * 1000`)

**Exports:** `connectToHA()`, `disconnectFromHA()`, `isHaConfigured()`, `haEvents`, `plantStates`, `plantAreaNames`, `linkedSensorIds`, `plantSensorValues`, `haConnected`, `haAvailable`, `haError`, `haUrl`, `haToken`, `plantbookUrl`

---

### `src/ha-test.html` + `src/ha-test.mjs` ✅ (developer validation tool)

Standalone test page — never linked from the main app. Confirms:
- ✅ WebSocket connection and plant device discovery
- ✅ Area names resolved from device/entity registries
- ✅ Live sensor readings in table (moisture, temperature, illuminance, conductivity)
- ✅ Row highlights green for 2 s on `sensor_changed` events
- ✅ "Watered in last 24h" section: detects moisture jumps ≥ 15% from compressed history

---

### `src/services/plantData.mjs` ✅

Game state layer. Handles coin logic, sensor-change detection, and persistence.

**Persisted (localStorage):**
- Per-plant interaction log: `{ lastPetted, lastWatered, lastWateredAt, lastMoved, lastMovedAt, inSun }` — all timestamps as **milliseconds**
- Cached plant list — `[{ entityId, friendlyName }]` — preserved from last HA session so plants render offline

**Coin rewards and cooldowns:**

| Action | Coins | Cooldown | Trigger |
|--------|-------|----------|---------|
| Pet    | +2    | 1 min    | Manual in-app tap |
| Water  | +20   | 30 min   | Moisture sensor increase ≥ 15 points |
| Move   | +30   | 60 min   | Illuminance change ≥ 3× or ≥ 500 lux |

**Event subscriptions (both real-time and history use the same delta functions):**
- `haEvents.addListener('sensor_changed', ...)` — processes moisture/illuminance deltas in real time
- `haEvents.addListener('history', ...)` — processes compressed history chronologically per sensor entity

**Deduplication:** each action is guarded by a timestamp comparison (`haTimestamp <= data.lastWateredAt`) using milliseconds, preventing double-awards when history catch-up re-processes already-rewarded events.

---

### `src/constants/plants.mjs` — OpenPlantbook link

Each entry in `KNOWN_PLANTS` includes an `openPlantbookPid` field. This is the exact pid string used to query the OpenPlantbook API:

```
GET <plantbookUrl>?species=<openPlantbookPid>
```

Response fields used for sensor assessment thresholds:
```json
{
    "min_soil_moist": 15, "max_soil_moist": 60,
    "min_temp": 12,       "max_temp": 32,
    "min_light_lux": 800, "max_light_lux": 15000,
    "min_soil_ec": 350,   "max_soil_ec": 2000
}
```

OpenPlantbook field → HA/app sensor key mapping:
| OpenPlantbook field | App sensor key |
|---|---|
| `min_soil_moist` / `max_soil_moist` | `moisture` |
| `min_temp` / `max_temp` | `temperature` |
| `min_light_lux` / `max_light_lux` | `illuminance` |
| `min_soil_ec` / `max_soil_ec` | `conductivity` |

The `fetchPlantbookRanges(pid)` stub in `homeAssistant.mjs` returns `null` if `plantbookUrl` is not configured. `assessSensor` (in `plantData.mjs`) should be updated to:
1. Check a per-session cache of fetched OpenPlantbook ranges (avoid repeated API calls)
2. If not cached and `openPlantbookPid` is known, call `fetchPlantbookRanges(pid)` and cache result
3. Use fetched ranges for threshold comparison
4. Fall back to `'unknown'` if no ranges available (HA no longer provides min/max attributes since there are no `plant.*` entities)

> **Implementation note:** `assessSensor` is currently in `plantData.mjs` and reads from `plantStates.value[entityId].attributes`. Since we now use device IDs with synthetic state objects (no real HA attributes), the HA-attribute fallback path is effectively always empty. OpenPlantbook becomes the **only** source of thresholds. The per-session cache of fetched ranges should live in `plantData.mjs` as an in-memory map.

---

### `src/pages/EarnCoins.mjs` (new)

Simple choice screen.
- Coin balance in header (consistent with Home)
- Two large retro buttons: **"See Dogs"** → `router.goTo('Feed')` and **"PLANTS!"** → `router.goTo('Plants')`
- Back button → `router.goTo('Home')`
- Styled with Goober `css()`

---

### `src/pages/Plants.mjs` (new, largest)

Main plant game page.

**Header:** current room name + map/compass icon to open room picker overlay

**Room picker overlay:** list of rooms that have at least one plant in `cachedPlants`; tap to switch. "Other" room catches all unrecognised HA areas.

**Room background:** coloured wall + floor using `KNOWN_ROOMS` palette — CSS only, no external assets.

**Plant cards** (one per plant in the active room):
- Emoji + display name (from `resolvePlant(friendlyName)`)
- Sensor readouts with colour coding — only when HA connected and values present:
  - 💧 Moisture, 🌡️ Temperature, ☀️ Illuminance, 🧪 Conductivity
  - Colour: green (good) / amber (warn) / red (bad) / grey (unknown) — via `assessSensor()`
- Sun/shade indicator (🌞 / 🌙) — updates automatically on lux-change detection
- **Pet button** (🤚 +2) — greyed out during cooldown

**Offline / no HA banner:**
- Shown when `haAvailable` is false and HA is configured
- Plants still render from `cachedPlants` with no sensor data
- Pet action still works
- Subtle note: "Watering and move rewards need your home network"

**HA setup prompt:**
- Shown inline (instead of banner) when `isHaConfigured()` is false
- Fields: HA URL, Long-lived access token, Connect button
- Saves to localStorage and calls `connectToHA()` on connect

**Coin pop notifications:**
- Appear when watering or move coins are awarded (real-time or catch-up)
- e.g. "💧 Watered! +20" / "☀️ Moved! +30"
- Uses existing `RetroToast` component

---

## Modified files

### `src/services/routes.mjs`
Add two routes:
- `/earn-coins` → `EarnCoins`
- `/plants` → `Plants`

### `src/pages/Home.mjs`
Change `"Earn Coins"` button target from `router.goTo('Feed')` to `router.goTo('EarnCoins')`.

---

## Backend: OpenPlantbook integration

The `fetchPlantbookRanges(pid)` function in `homeAssistant.mjs` makes a GET request to `plantbookUrl?species=<pid>`. A lightweight proxy is needed because the OpenPlantbook API requires an API key and CORS blocks direct browser requests.

**Recommended approach: Cloudflare Worker**
- Accepts `GET /?species=<pid>`
- Queries `https://open.plantbook.io/api/v1/plant/detail/<pid>/` using a stored API key
- Caches results in Workers KV to minimise API calls
- Returns the OpenPlantbook JSON directly (or a trimmed subset)
- Player configures their Worker URL in the HA setup screen (`plantbookUrl` field)

**Alternative: static JSON file**
- Manually create `src/data/plant-ranges.json` with entries for the known plants in `KNOWN_PLANTS`
- Fetch it as a static asset (no proxy needed; no API key)
- Simplest for a single-user setup with a fixed plant list — just run the query manually once per plant

This is follow-up work. The client-side stub and config field are already implemented; the Worker/static file is a separate task.

---

## Out of scope (this implementation)

- Custom room background artwork and plant sprite PNGs — emoji placeholders used throughout
- Sending commands back to HA (watering detection is read-only)
- OpenPlantbook proxy/static file — client stub is ready, data source is follow-up
