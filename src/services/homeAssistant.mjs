import { ref } from 'vue';
import { persistRef } from '../utilities/vue.mjs';
import EventBus from '../utilities/functions.mjs';

// ── Persisted config ─────────────────────────────────────────────────────────

export const haUrl = ref('');
persistRef(haUrl, 'DOGSTAGRAM_HA_URL', true);

export const haToken = ref('');
persistRef(haToken, 'DOGSTAGRAM_HA_TOKEN', true);

export const plantbookUrl = ref('');
persistRef(plantbookUrl, 'DOGSTAGRAM_PLANTBOOK_URL', true);

// ── Reactive state ────────────────────────────────────────────────────────────

export const haConnected = ref(false);
export const haAvailable = ref(false);
export const haError = ref('');

// { [deviceId]: synthetic state object } — "plant ID" is device ID
// state object shape: { entity_id: deviceId, state: null, attributes: { friendly_name, ...thresholds } }
export const plantStates = ref({});

// { [deviceId]: area name string }
export const plantAreaNames = ref({});

// { [deviceId]: string[] } — linked sensor.* entity IDs for this plant device
export const linkedSensorIds = ref({});

// { [deviceId]: { moisture, temperature, illuminance, conductivity } }
export const plantSensorValues = ref({});

// EventBus for plantData.mjs to subscribe to HA events
export const haEvents = new EventBus();

// ── Internal state ────────────────────────────────────────────────────────────

let ws = null;
let msgId = 1;
let reconnectTimer = null;
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

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function bootstrap(statesResult, entityRegistryResult, areaRegistryResult, deviceRegistryResult) {
    // Area lookup: area_id → human-readable name
    const areaIdToName = {};
    for (const area of areaRegistryResult) {
        areaIdToName[area.area_id] = area.name;
    }

    // Device lookup: device_id → { name, area_id }
    const deviceById = {};
    for (const device of deviceRegistryResult) {
        deviceById[device.id] = {
            name: device.name_by_user || device.name || device.id,
            area_id: device.area_id || null,
        };
    }

    // Entity registry: group sensor entities by device_id
    const sensorsByDevice = {};  // device_id → [entity_id, ...]
    const entityAreaOverride = {}; // entity_id → area_id (entity-level override)

    for (const entry of entityRegistryResult) {
        if (!entry.device_id) continue;
        entityAreaOverride[entry.entity_id] = entry.area_id || null;

        if (isSensorEntity(entry.entity_id)) {
            if (!sensorsByDevice[entry.device_id]) {
                sensorsByDevice[entry.device_id] = [];
            }
            sensorsByDevice[entry.device_id].push(entry.entity_id);
        }
    }

    // State lookup by entity_id for quick access
    const stateByEntityId = {};
    for (const state of statesResult) {
        stateByEntityId[state.entity_id] = state;
    }

    // Build plant data from sensor devices
    const newPlantStates = {};
    const newPlantAreaNames = {};
    const newLinkedSensorIds = {};
    const newPlantSensorValues = {};
    const newSensorToPlant = {};

    for (const [deviceId, sensorEntityIds] of Object.entries(sensorsByDevice)) {
        // Classify all sensors for this device
        const classified = {};  // sensorType → entityId
        for (const sensorId of sensorEntityIds) {
            const sensorState = stateByEntityId[sensorId];
            const sensorType = classifySensorType(sensorId, sensorState);
            if (sensorType && !classified[sensorType]) {
                classified[sensorType] = sensorId;
            }
        }

        // Only treat as a plant device if it has moisture or illuminance sensors
        if (!classified.moisture && !classified.illuminance) continue;

        const device = deviceById[deviceId];
        if (!device) continue;

        // Area: prefer entity-level area_id on the moisture sensor, then device-level
        const primarySensorId = classified.moisture || classified.illuminance;
        const areaId = entityAreaOverride[primarySensorId] || device.area_id;
        const areaName = areaId ? (areaIdToName[areaId] || null) : null;

        // Build initial sensor values from current sensor states
        const sensorValues = { moisture: null, temperature: null, illuminance: null, conductivity: null };
        for (const [sensorType, sensorId] of Object.entries(classified)) {
            const sensorState = stateByEntityId[sensorId];
            if (sensorState) {
                const parsed = parseFloat(sensorState.state);
                if (!isNaN(parsed)) sensorValues[sensorType] = parsed;
            }
            // Register in sensorToPlant for live event routing
            newSensorToPlant[sensorId] = { plantId: deviceId, sensorType };
        }

        // Synthetic state object (no real plant.* entity, so state is always null)
        newPlantStates[deviceId] = {
            entity_id: deviceId,
            state: null,
            attributes: { friendly_name: device.name },
        };

        newPlantAreaNames[deviceId] = areaName;
        newLinkedSensorIds[deviceId] = sensorEntityIds;
        newPlantSensorValues[deviceId] = sensorValues;
    }

    plantStates.value = newPlantStates;
    plantAreaNames.value = newPlantAreaNames;
    linkedSensorIds.value = newLinkedSensorIds;
    plantSensorValues.value = newPlantSensorValues;
    sensorToPlant = newSensorToPlant;
}

// ── Connection ────────────────────────────────────────────────────────────────

export function isHaConfigured() {
    return !!(haUrl.value && haToken.value);
}

export function connectToHA() {
    if (!isHaConfigured()) return;

    intentionalClose = false;
    if (ws) ws.close();

    haConnected.value = false;
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

            // Four parallel bootstrap requests
            const statesId    = nextId();
            const entityRegId = nextId();
            const areaRegId   = nextId();
            const deviceRegId = nextId();

            const [statesRes, entityRegRes, areaRegRes, deviceRegRes] = await Promise.all([
                sendWithResponse({ id: statesId,    type: 'get_states' }),
                sendWithResponse({ id: entityRegId, type: 'config/entity_registry/list' }),
                sendWithResponse({ id: areaRegId,   type: 'config/area_registry/list' }),
                sendWithResponse({ id: deviceRegId, type: 'config/device_registry/list' }),
            ]);

            if (!statesRes.success || !entityRegRes.success || !areaRegRes.success || !deviceRegRes.success) {
                haError.value = 'Failed to load HA data';
                return;
            }

            bootstrap(statesRes.result, entityRegRes.result, areaRegRes.result, deviceRegRes.result);

            // History for all linked sensor entities (the real readings live there)
            const allSensorIds = Object.values(linkedSensorIds.value).flat();
            if (allSensorIds.length > 0) {
                const now = new Date();
                const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const historyRes = await sendWithResponse({
                    id: nextId(),
                    type: 'history/history_during_period',
                    start_time: yesterday.toISOString(),
                    end_time: now.toISOString(),
                    entity_ids: allSensorIds,
                    significant_changes_only: false,
                });

                if (historyRes.success) {
                    haEvents.emit('history', { historyData: historyRes.result, sensorToPlant });
                }
            }

            send({ id: nextId(), type: 'subscribe_events', event_type: 'state_changed' });
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
    if (ws) {
        ws.close();
        ws = null;
    }
    haConnected.value = false;
}

// ── OpenPlantbook stub ────────────────────────────────────────────────────────

export async function fetchPlantbookRanges(speciesName) {
    if (!plantbookUrl.value) return null;
    try {
        const res = await fetch(`${plantbookUrl.value}?species=${encodeURIComponent(speciesName)}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}
