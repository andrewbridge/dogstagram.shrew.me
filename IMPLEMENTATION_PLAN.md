# Plant Care Mini-Game — Implementation Plan

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

### `src/constants/plants.mjs`
Static mapping data — no runtime dependencies.

- `KNOWN_ROOMS` — room keys → `{ name, wallColour, floorColour, accentColour }`
  - Predefined rooms: `living_room`, `bedroom`, `kitchen`, `bathroom`, `office`, `hallway`, `other`
- `KNOWN_PLANT_TYPES` — substring patterns → `{ name, emoji, size }`
  - Matched against HA entity IDs (e.g. `plant.bedroom_monstera` matches `monstera`)
  - Covers: monstera, pothos, philodendron, fern, orchid, succulent, cactus, snake plant, peace lily, jade, aloe, calathea, fiddle leaf fig; falls back to `default` (🪴)
- `AREA_TO_ROOM` — HA area name strings (lowercase) → room keys, with partial matching
- `resolveRoomKey(areaName)` — maps an HA area name to a room key
- `resolvePlantType(entityId)` — maps an entity ID to a plant type entry

### `src/services/homeAssistant.mjs`
All Home Assistant communication. Local network only — if the URL is unreachable the app continues without sensor data.

**Persisted config (localStorage):**
- `haUrl` — e.g. `http://192.168.1.x:8123`
- `haToken` — long-lived access token
- `plantbookUrl` — optional OpenPlantbook proxy URL (see backend section below)

**Reactive state:**
- `haConnected` — WebSocket auth succeeded
- `haAvailable` — at least one successful connection this session
- `haError` — human-readable error string

**Reactive data:**
- `plantStates` — `{ [entityId]: HA state object }` — live, updated in real time
- `plantAreaNames` — `{ [entityId]: area name string }` — resolved from HA registries

**Connection flow:**
1. Open WebSocket to `ws://<haUrl>/api/websocket`
2. Respond to `auth_required` with `{ type: "auth", access_token }`
3. On `auth_ok`: in parallel, send:
   - `get_states` — all current entity states
   - `config/entity_registry/list` — entity → area_id mapping
   - `config/area_registry/list` — area_id → area name mapping
4. Filter states for `plant.*` entities; populate `plantStates` and `plantAreaNames`
5. Send `history/history_during_period` for all plant entities, 24h window (see catch-up section)
6. Subscribe to `state_changed` events for live updates
7. Auto-reconnect after 10 s on disconnect

**Exports:** `connectToHA()`, `disconnectFromHA()`, `isHaConfigured()`

**OpenPlantbook stub:**
```js
fetchPlantbookRanges(speciesName) // → null if plantbookUrl not configured
```

### `src/services/plantData.mjs`
Game state layer. Handles coin logic, sensor-change detection, and persistence.

**Persisted (localStorage):**
- Per-plant interaction log: `{ lastPetted, lastWatered, lastWateredAt, lastMoved, lastMovedAt, inSun }`
  - `*At` fields store the HA-reported `last_changed` timestamp (not wall clock) to prevent double-awarding
- Cached plant list — entity IDs + friendly names preserved from last HA connection so plants remain visible offline

**Coin rewards and cooldowns:**

| Action | Coins | Cooldown | Trigger |
|--------|-------|----------|---------|
| Pet    | +2    | 1 min    | Manual in-app tap |
| Water  | +20   | 30 min   | Moisture sensor increase ≥ 15 points |
| Move   | +30   | 60 min   | Illuminance change ≥ 3× or ≥ 500 lux |

**Real-time detection:**
- On each `state_changed` event, compare incoming attributes against the previous snapshot held in memory
- If moisture delta ≥ threshold → `waterPlant(entityId, eventTimestamp)`
- If lux delta ≥ threshold → `movePlant(entityId, eventTimestamp)` + toggle `inSun`
- Uses `new_state.last_changed` as event timestamp (not `Date.now()`)

**Catch-up on connect:**
- After bootstrap, process the 24h history response chronologically per entity
- Same delta-detection logic as real-time path
- Only awards coins if the detected event timestamp > `lastWateredAt` / `lastMovedAt` for that plant
- Prevents double-awarding when app is opened multiple times
- **Intentional design decision:** if the app is not opened within 24 hours of a physical action, the reward is not granted — this is acceptable behaviour

**Sensor assessment:**
- `assessSensor(entityId, key)` → `'good' | 'warn' | 'bad' | 'unknown'`
- Uses HA's built-in `min_<sensor>` / `max_<sensor>` attributes when present (set by the HA Plant integration)
- Returns `'unknown'` when no range data is available (see OpenPlantbook section)

### `src/pages/EarnCoins.mjs`
Simple choice screen.
- Coin balance in header (consistent with Home)
- Two large retro buttons: **"See Dogs"** and **"PLANTS!"**
- Back button → Home

### `src/pages/Plants.mjs`
Main plant game page.

**Header:** current room name + map/compass icon to open room picker overlay

**Room picker overlay:** list of occupied rooms (rooms with at least one known plant); tap to switch; "Other" room catches all unrecognised HA areas

**Room background:** coloured wall + floor using `KNOWN_ROOMS` palette — CSS only, no external assets required

**Plant cards** (one per plant in the active room):
- Emoji + display name (from `KNOWN_PLANT_TYPES` or HA friendly name)
- Status badge (✓ ok / ⚠ problem) — only when HA connected and state available
- Sensor readouts with colour coding — only when HA connected and values present:
  - 💧 Moisture, 🌡️ Temperature, ☀️ Illuminance, 🧪 Conductivity
  - Colour: green (good) / amber (warn) / red (bad) / grey (unknown)
- Sun/shade indicator (🌞 / 🌙) — updates automatically on lux-change detection
- **Pet button** (🤚 +2) — greyed out during cooldown

**Offline / no HA banner:**
- Shown when `haAvailable` is false
- Plants still render from cached entity list with no sensor data
- Pet action still works
- Subtle note: "Watering and move rewards need your home network"

**HA setup prompt:**
- Shown inline (instead of banner) when `isHaConfigured()` is false
- Fields: HA URL, Long-lived access token, Connect button
- On connect, saves to localStorage and calls `connectToHA()`

**Coin pop notifications:**
- Appear automatically when watering or move coins are awarded (real-time or catch-up)
- e.g. "💧 Watered! +20" / "☀️ Moved to shade! +30"
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

HA's Plant integration stores `min_moisture`, `max_moisture` etc. on entity attributes when the user has manually configured thresholds. For these plants, sensor assessment works immediately with no backend.

For plants without manually-configured HA thresholds, species-specific ranges require querying [OpenPlantbook](https://open.plantbook.io/). Because this requires an API key and CORS makes direct client-side calls impractical, a lightweight backend is needed.

**Recommended approach: Cloudflare Worker**
- Accepts `GET /?species=<name>`
- Queries OpenPlantbook API using a stored API key
- Caches results in Workers KV to minimise API usage
- Returns `{ min_moisture, max_moisture, min_temperature, max_temperature, min_brightness, max_brightness, min_conductivity, max_conductivity }`
- The player configures their Worker URL in the HA setup screen (`plantbookUrl` field)
- The `fetchPlantbookRanges()` stub in `homeAssistant.mjs` is already wired up for this

**Alternative: scheduled GitHub Action**
- Runs daily; fetches ranges for a predefined list of plant species
- Commits results to `src/data/plant-ranges.json` in the repo
- Served via GitHub Pages alongside the app
- Simpler operationally but requires knowing all species in advance

This is follow-up work. The client-side stub and config field are implemented in the initial PR; the Worker/Action itself is a separate task.

---

## Out of scope (this implementation)

- Custom room background artwork and plant sprite PNGs — emoji placeholders used throughout
- Sending commands back to HA (watering detection is read-only; HA is never written to)
- OpenPlantbook Worker/Action — client stub is ready, backend is follow-up
