import { ref, watch } from 'vue';
import { persistRef } from '../utilities/vue.mjs';
import EventBus from '../utilities/functions.mjs';
import { readCache, writeCache, isCacheFresh, clearCache, readCacheIDB, writeCacheIDB, isCacheFreshIDB, clearCacheIDB } from '../utilities/cache.mjs';

// ── Persisted config ─────────────────────────────────────────────────────────

export const haUrl = ref('http://homeassistant.local:8123');

export const haToken = ref('');
persistRef(haToken, 'DOGSTAGRAM_HA_TOKEN', true);


// ── Reactive state ────────────────────────────────────────────────────────────

export const haConnected = ref(false);
export const haAvailable = ref(false);
export const haHistoryLoaded = ref(false);
export const haError = ref('');
export const isRefreshing = ref(false);

// { [deviceId]: synthetic state object } — "plant ID" is device ID
// state object shape: { entity_id: deviceId, state: null, attributes: { friendly_name, ...thresholds } }
export const plantStates = ref({});

// { [deviceId]: HA area_id string }
export const plantAreaIds = ref({});

// { [area_id]: { name: string, aliases: string[] } } — full area registry from HA
export const haAreas = ref({});

// { [deviceId]: string[] } — linked sensor.* entity IDs for this plant device
export const linkedSensorIds = ref({});

// { [deviceId]: { moisture, temperature, illuminance, conductivity } }
export const plantSensorValues = ref({});

// true when sun.sun state is 'above_horizon' — used to suppress illuminance assessment at night.
// If sun.sun is unavailable, falls back to a rough daytime estimate (7am–8pm local).
export const sunAboveHorizon = ref(isDaytimeGuess());
let hasSunEntity = false;

function isDaytimeGuess() {
    const h = new Date().getHours();
    return h >= 7 && h < 20;
}

// EventBus for plantData.mjs to subscribe to HA events
export const haEvents = new EventBus();

// ── Cache keys & TTLs ────────────────────────────────────────────────────────

const CACHE_KEY_ENTITY_REG = 'DOGSTAGRAM_HA_ENTITY_REGISTRY';
const CACHE_KEY_AREA_REG   = 'DOGSTAGRAM_HA_AREA_REGISTRY';
const CACHE_KEY_DEVICE_REG = 'DOGSTAGRAM_HA_DEVICE_REGISTRY';
const CACHE_KEY_STATES     = 'DOGSTAGRAM_HA_STATES';

const REGISTRY_MAX_AGE = Infinity;        // manual refresh only
const STATES_MAX_AGE   = 10 * 60 * 1000;  // 10 minutes
const HISTORY_MAX_AGE  = 5 * 60 * 1000;   // 5 minutes

const CACHE_KEY_HISTORY    = 'DOGSTAGRAM_HA_SENSOR_HISTORY';

const LS_CACHE_KEYS = [CACHE_KEY_ENTITY_REG, CACHE_KEY_AREA_REG, CACHE_KEY_DEVICE_REG, CACHE_KEY_STATES];

// Clear all caches when HA token changes
watch(haToken, () => {
    LS_CACHE_KEYS.forEach(clearCache);
    clearCacheIDB(CACHE_KEY_HISTORY);
});

// ── Internal state ────────────────────────────────────────────────────────────

let ws = null;
let msgId = 1;
let reconnectTimer = null;
let sunFallbackTimer = null;
let intentionalClose = false;

const pending = new Map();

// { [sensorEntityId]: { plantId: deviceId, sensorType } }
let sensorToPlant = {};

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextId() {
    return msgId++;
}

function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
    }
}

function sendWithResponse(obj) {
    return new Promise((resolve) => {
        pending.set(obj.id, resolve);
        send(obj);
    });
}

function buildWsUrl(httpUrl) {
    return httpUrl.replace(/^http/, 'ws') + '/api/websocket';
}

function isSensorEntity(entityId) {
    return entityId && entityId.startsWith('sensor.');
}

/**
 * Classify a sensor entity as a plant sensor type.
 * Returns 'moisture' | 'illuminance' | 'temperature' | 'conductivity' | null
 */
function classifySensorType(sensorEntityId, sensorState) {
    const deviceClass = sensorState?.attributes?.device_class;
    if (deviceClass === 'moisture') return 'moisture';
    if (deviceClass === 'illuminance') return 'illuminance';
    if (deviceClass === 'temperature') return 'temperature';

    const lower = sensorEntityId.toLowerCase();
    if (lower.includes('conductivity')) return 'conductivity';
    if (lower.includes('moisture') || lower.includes('soil_moisture')) return 'moisture';
    if (lower.includes('illuminance') || lower.includes('brightness') || lower.includes('light_level')) return 'illuminance';
    if (lower.includes('temperature') || lower.includes('_temp_')) return 'temperature';

    return null;
}

// ── Cache-aware fetch ────────────────────────────────────────────────────────

async function fetchOrCache(cacheKey, maxAgeMs, wsFetchFn) {
    if (isCacheFresh(cacheKey, maxAgeMs)) {
        return readCache(cacheKey).data;
    }
    const result = await wsFetchFn();
    if (result.success) {
        writeCache(cacheKey, result.result);
        return result.result;
    }
    // Fall back to stale cache if fetch fails
    const stale = readCache(cacheKey);
    return stale ? stale.data : null;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function bootstrap(statesResult, entityRegistryResult, areaRegistryResult, deviceRegistryResult) {
    // Area registry: area_id → { name, aliases }
    const newHaAreas = {};
    for (const area of areaRegistryResult) {
        newHaAreas[area.area_id] = { name: area.name, aliases: area.aliases || [] };
    }
    haAreas.value = newHaAreas;

    // Device lookup: device_id → { area_id }
    const deviceById = {};
    for (const device of deviceRegistryResult) {
        deviceById[device.id] = { area_id: device.area_id || null };
    }

    // Entity registry: entity_id → device_id; sensor entities grouped by device_id
    const deviceByEntityId = {};   // entity_id → device_id
    const entityAreaById = {};     // entity_id → area_id (entity-level override)
    const sensorsByDevice = {};    // device_id → [sensor entity_id, ...]

    for (const entry of entityRegistryResult) {
        if (!entry.device_id) continue;
        deviceByEntityId[entry.entity_id] = entry.device_id;
        entityAreaById[entry.entity_id] = entry.area_id || null;

        if (isSensorEntity(entry.entity_id)) {
            if (!sensorsByDevice[entry.device_id]) sensorsByDevice[entry.device_id] = [];
            sensorsByDevice[entry.device_id].push(entry.entity_id);
        }
    }

    // State lookup by entity_id for quick access
    const stateByEntityId = {};
    for (const state of statesResult) {
        stateByEntityId[state.entity_id] = state;
    }

    // Initialise sun position
    const sunState = stateByEntityId['sun.sun'];
    if (sunState) {
        hasSunEntity = true;
        sunAboveHorizon.value = sunState.state === 'above_horizon';
    } else {
        hasSunEntity = false;
        sunAboveHorizon.value = isDaytimeGuess();
        clearInterval(sunFallbackTimer);
        sunFallbackTimer = setInterval(() => { sunAboveHorizon.value = isDaytimeGuess(); }, 5 * 60 * 1000);
    }

    // Build plant data from plant.* entities
    const newPlantStates = {};
    const newPlantAreaIds = {};
    const newLinkedSensorIds = {};
    const newPlantSensorValues = {};
    const newSensorToPlant = {};

    for (const plantState of statesResult.filter(s => s.entity_id.startsWith('plant.'))) {
        const entityId = plantState.entity_id;
        const deviceId = deviceByEntityId[entityId];
        const device   = deviceId ? deviceById[deviceId] : null;

        // Area: prefer entity-level override, then device-level
        const areaId = entityAreaById[entityId] || device?.area_id || null;

        // Linked sensors: all sensor.* entities on the same device
        const sensorEntityIds = deviceId ? (sensorsByDevice[deviceId] || []) : [];

        // Initial sensor values + register sensorToPlant routing
        const sensorValues = { moisture: null, temperature: null, illuminance: null, conductivity: null };
        for (const sensorId of sensorEntityIds) {
            const sensorState = stateByEntityId[sensorId];
            const sensorType  = classifySensorType(sensorId, sensorState);
            if (!sensorType) continue;
            if (sensorValues[sensorType] === null) {
                const parsed = parseFloat(sensorState?.state);
                if (!isNaN(parsed)) sensorValues[sensorType] = parsed;
            }
            newSensorToPlant[sensorId] = { plantId: entityId, sensorType };
        }

        newPlantStates[entityId]       = { entity_id: entityId, state: plantState.state, attributes: plantState.attributes };
        newPlantAreaIds[entityId]      = areaId;
        newLinkedSensorIds[entityId]   = sensorEntityIds;
        newPlantSensorValues[entityId] = sensorValues;
    }

    plantStates.value       = newPlantStates;
    plantAreaIds.value      = newPlantAreaIds;
    linkedSensorIds.value   = newLinkedSensorIds;
    plantSensorValues.value = newPlantSensorValues;
    sensorToPlant           = newSensorToPlant;
}

// ── Connection ────────────────────────────────────────────────────────────────

export function isHaConfigured() {
    return !!haToken.value;
}

export function connectToHA() {
    if (!isHaConfigured()) return;
    // Don't restart if a connection is already in progress or established
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

    intentionalClose = false;
    if (ws) ws.close();

    haConnected.value = false;
    haAvailable.value = false;
    haHistoryLoaded.value = false;
    haError.value = '';

    ws = new WebSocket(buildWsUrl(haUrl.value));

    ws.addEventListener('message', async (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            return;
        }

        if (msg.type === 'auth_required') {
            send({ type: 'auth', access_token: haToken.value });
            return;
        }

        if (msg.type === 'auth_invalid') {
            haError.value = 'Invalid HA token — check your long-lived access token';
            intentionalClose = true;
            ws.close();
            return;
        }

        if (msg.type === 'auth_ok') {
            haConnected.value = true;

            // Registries: cached aggressively (manual refresh only)
            // States: cached with 10-minute TTL
            const [entityRegData, areaRegData, deviceRegData, statesData] = await Promise.all([
                fetchOrCache(CACHE_KEY_ENTITY_REG, REGISTRY_MAX_AGE, () =>
                    sendWithResponse({ id: nextId(), type: 'config/entity_registry/list' })),
                fetchOrCache(CACHE_KEY_AREA_REG, REGISTRY_MAX_AGE, () =>
                    sendWithResponse({ id: nextId(), type: 'config/area_registry/list' })),
                fetchOrCache(CACHE_KEY_DEVICE_REG, REGISTRY_MAX_AGE, () =>
                    sendWithResponse({ id: nextId(), type: 'config/device_registry/list' })),
                fetchOrCache(CACHE_KEY_STATES, STATES_MAX_AGE, () =>
                    sendWithResponse({ id: nextId(), type: 'get_states' })),
            ]);

            if (!entityRegData || !areaRegData || !deviceRegData || !statesData) {
                haError.value = 'Failed to load HA data';
                return;
            }

            bootstrap(statesData, entityRegData, areaRegData, deviceRegData);

            // History: cached in IndexedDB with 5-minute TTL (too large for localStorage)
            try {
                const allSensorIds = Object.values(linkedSensorIds.value).flat();
                if (allSensorIds.length > 0) {
                    let historyData = null;

                    if (await isCacheFreshIDB(CACHE_KEY_HISTORY, HISTORY_MAX_AGE)) {
                        historyData = (await readCacheIDB(CACHE_KEY_HISTORY)).data;
                    } else {
                        const historyRes = await sendWithResponse({
                            id: nextId(),
                            type: 'history/history_during_period',
                            start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                            end_time: new Date().toISOString(),
                            entity_ids: allSensorIds,
                            significant_changes_only: false,
                        });
                        if (historyRes.success) {
                            historyData = historyRes.result;
                            writeCacheIDB(CACHE_KEY_HISTORY, historyData);
                        }
                    }

                    if (historyData) {
                        haEvents.emit('history', { historyData, sensorToPlant });
                    }
                }
            } catch (err) {
                console.warn('[HA] History fetch/processing failed:', err);
            }

            // Always subscribe for live sensor/plant updates
            send({ id: nextId(), type: 'subscribe_events', event_type: 'state_changed' });
            haHistoryLoaded.value = true;
            haAvailable.value = true;
            return;
        }

        // Resolve pending request callbacks
        if (msg.type === 'result' && pending.has(msg.id)) {
            const resolve = pending.get(msg.id);
            pending.delete(msg.id);
            resolve(msg);
            return;
        }

        // Live state_changed events
        if (msg.type === 'event' && msg.event?.event_type === 'state_changed') {
            const { entity_id, old_state, new_state } = msg.event.data;

            if (entity_id === 'sun.sun') {
                sunAboveHorizon.value = new_state?.state === 'above_horizon';
            }

            // Plant entity update → refresh status attributes in plantStates
            if (entity_id.startsWith('plant.') && plantStates.value[entity_id] && new_state) {
                plantStates.value = {
                    ...plantStates.value,
                    [entity_id]: { entity_id, state: new_state.state, attributes: new_state.attributes || {} },
                };
            }

            if (isSensorEntity(entity_id) && sensorToPlant[entity_id]) {
                const { plantId, sensorType } = sensorToPlant[entity_id];
                const newValue = new_state ? parseFloat(new_state.state) : NaN;
                const oldValue = old_state ? parseFloat(old_state.state) : NaN;

                if (!isNaN(newValue)) {
                    plantSensorValues.value = {
                        ...plantSensorValues.value,
                        [plantId]: {
                            ...(plantSensorValues.value[plantId] || {}),
                            [sensorType]: newValue,
                        },
                    };

                    haEvents.emit('sensor_changed', {
                        plantId,
                        sensorType,
                        oldValue: isNaN(oldValue) ? null : oldValue,
                        newValue,
                        // Normalise to milliseconds — history path uses lu*1000, real-time uses last_changed ISO string
                        timestamp: new_state.last_changed ? Date.parse(new_state.last_changed) : Date.now(),
                    });
                }
            }
        }
    });

    ws.addEventListener('close', () => {
        haConnected.value = false;
        pending.clear();
        if (!intentionalClose) {
            reconnectTimer = setTimeout(() => connectToHA(), 10_000);
        }
    });

    ws.addEventListener('error', () => {
        if (!haAvailable.value) {
            haError.value = 'Could not reach Home Assistant — check your URL and network';
        }
    });
}

export function disconnectFromHA() {
    intentionalClose = true;
    clearTimeout(reconnectTimer);
    clearInterval(sunFallbackTimer);
    if (ws) {
        ws.close();
        ws = null;
    }
    haConnected.value = false;
}

export async function refreshRegistries() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    isRefreshing.value = true;

    // Clear all caches to force fresh fetches
    LS_CACHE_KEYS.forEach(clearCache);
    clearCacheIDB(CACHE_KEY_HISTORY);

    try {
        const [statesRes, entityRegRes, areaRegRes, deviceRegRes] = await Promise.all([
            sendWithResponse({ id: nextId(), type: 'get_states' }),
            sendWithResponse({ id: nextId(), type: 'config/entity_registry/list' }),
            sendWithResponse({ id: nextId(), type: 'config/area_registry/list' }),
            sendWithResponse({ id: nextId(), type: 'config/device_registry/list' }),
        ]);

        if (statesRes.success) writeCache(CACHE_KEY_STATES, statesRes.result);
        if (entityRegRes.success) writeCache(CACHE_KEY_ENTITY_REG, entityRegRes.result);
        if (areaRegRes.success) writeCache(CACHE_KEY_AREA_REG, areaRegRes.result);
        if (deviceRegRes.success) writeCache(CACHE_KEY_DEVICE_REG, deviceRegRes.result);

        if (statesRes.success && entityRegRes.success && areaRegRes.success && deviceRegRes.success) {
            bootstrap(statesRes.result, entityRegRes.result, areaRegRes.result, deviceRegRes.result);

            // Re-fetch history too
            const allSensorIds = Object.values(linkedSensorIds.value).flat();
            if (allSensorIds.length > 0) {
                const now = new Date();
                const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
                const historyRes = await sendWithResponse({
                    id: nextId(),
                    type: 'history/history_during_period',
                    start_time: threeDaysAgo.toISOString(),
                    end_time: now.toISOString(),
                    entity_ids: allSensorIds,
                    significant_changes_only: false,
                });
                if (historyRes.success) {
                    writeCacheIDB(CACHE_KEY_HISTORY, historyRes.result);
                    haEvents.emit('history', { historyData: historyRes.result, sensorToPlant });
                }
            }
        }
    } finally {
        isRefreshing.value = false;
    }
}

