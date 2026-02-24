import { ref } from 'vue';
import { persistRef } from '../utilities/vue.mjs';
import { accountBalance, events } from './data.mjs';
import { haEvents, plantStates, plantAreaIds } from './homeAssistant.mjs';

// ── Persistence ───────────────────────────────────────────────────────────────

// Per-plant interaction log keyed by entityId.
// Shape: { [entityId]: { lastPetted, lastWatered, lastWateredAt, lastMoved, lastMovedAt, inSun } }
const plantInteractions = ref({});
persistRef(plantInteractions, 'DOGSTAGRAM_PLANT_INTERACTIONS', true);

// Preserved plant list from last HA connection so plants render offline.
// Shape: [{ entityId, friendlyName }]
export const cachedPlants = ref([]);
persistRef(cachedPlants, 'DOGSTAGRAM_CACHED_PLANTS', true);

// In-memory illuminance baselines — derived from 3-day HA history, not persisted.
// { [plantEntityId]: median daytime lux }
const illuminanceBaselines = new Map();

// Hours (local time) used to filter out night readings when computing the baseline.
const DAYTIME_START_HOUR = 9;
const DAYTIME_END_HOUR   = 17;

// A plant is considered "in low light" when its median daytime lux is below this.
const ILLUMINANCE_LOW_THRESHOLD = 200;
// A reading above this triggers "moved into sun" (when baseline is low).
const ILLUMINANCE_HIGH_READING  = 500;

// ── Internal helpers ──────────────────────────────────────────────────────────

function getPlantData(entityId) {
    return plantInteractions.value[entityId] || {
        lastPetted:    0,
        lastWatered:   0,
        lastWateredAt: 0,  // milliseconds; 0 means never rewarded
        lastMoved:     0,
        lastMovedAt:   0,
        inSun:         false,
    };
}

function savePlantData(entityId, data) {
    plantInteractions.value = { ...plantInteractions.value, [entityId]: data };
}

// ── Coin rewards ──────────────────────────────────────────────────────────────

const PET_COOLDOWN_MS    = 1  * 60 * 1000;
const WATER_COOLDOWN_MS  = 30 * 60 * 1000;
const MOVE_COOLDOWN_MS   = 60 * 60 * 1000;

function waterPlant(entityId, haTimestamp) {
    const data = getPlantData(entityId);
    // Dedup: ignore if we've already rewarded this HA event or a later one
    if (haTimestamp && data.lastWateredAt && haTimestamp <= data.lastWateredAt) return;
    // Cooldown: wall-clock based
    if (Date.now() - data.lastWatered < WATER_COOLDOWN_MS) return;

    accountBalance.value += 20;
    data.lastWatered  = Date.now();
    data.lastWateredAt = haTimestamp || '';
    savePlantData(entityId, data);
    events.emit('plant-watered', { entityId, coins: 20 });
}

function movePlant(entityId, haTimestamp, newInSun) {
    const data = getPlantData(entityId);
    if (haTimestamp && data.lastMovedAt && haTimestamp <= data.lastMovedAt) return;
    if (Date.now() - data.lastMoved < MOVE_COOLDOWN_MS) return;

    accountBalance.value += 30;
    data.lastMoved  = Date.now();
    data.lastMovedAt = haTimestamp || '';
    data.inSun = newInSun;
    savePlantData(entityId, data);
    events.emit('plant-moved', { entityId, coins: 30, inSun: newInSun });
}

// ── Need-check helpers ────────────────────────────────────────────────────────
// These use the threshold attributes (min_*/max_*) set by the HA Plant integration
// (populated via OpenPlantbook) to confirm the plant actually needed the action.

function plantNeededWater(entityId, oldMoisture) {
    const attrs = plantStates.value[entityId]?.attributes;
    const min = parseFloat(attrs?.min_moisture);
    if (isNaN(min)) return false;
    // Also credit if moisture was within the bottom 20% of the healthy range (approaching dry)
    const max = parseFloat(attrs?.max_moisture);
    const threshold = isNaN(max) ? min : min + 0.2 * (max - min);
    return oldMoisture < threshold;
}

function plantNeededMoreLight(entityId, oldIlluminance) {
    const min = parseFloat(plantStates.value[entityId]?.attributes?.min_illuminance);
    return !isNaN(min) && oldIlluminance < min;
}

function plantHadTooMuchLight(entityId, oldIlluminance) {
    const max = parseFloat(plantStates.value[entityId]?.attributes?.max_illuminance);
    return !isNaN(max) && oldIlluminance > max;
}

// ── Delta detection ───────────────────────────────────────────────────────────

function processMoistureDelta(entityId, oldValue, newValue, haTimestamp) {
    if (oldValue === null || newValue === null) return;
    const delta = newValue - oldValue;
    if (delta >= 15 && plantNeededWater(entityId, oldValue)) waterPlant(entityId, haTimestamp);
}

function computeIlluminanceBaseline(plantId, sortedEntries) {
    const daytimeValues = sortedEntries
        .map(e => ({ value: parseFloat(e.s), hour: new Date((e.lu ?? 0) * 1000).getHours() }))
        .filter(({ value, hour }) =>
            !isNaN(value) && value >= 0 &&
            hour >= DAYTIME_START_HOUR && hour < DAYTIME_END_HOUR
        )
        .map(({ value }) => value);

    if (daytimeValues.length < 5) return;
    daytimeValues.sort((a, b) => a - b);
    illuminanceBaselines.set(plantId, daytimeValues[Math.floor(daytimeValues.length / 2)]);
}

function processIlluminanceDelta(entityId, oldValue, newValue, haTimestamp) {
    if (oldValue === null || newValue === null) return;
    const baseline = illuminanceBaselines.get(entityId);
    if (baseline === undefined) return; // no baseline yet — skip

    const wasInLowLight  = baseline < ILLUMINANCE_LOW_THRESHOLD;
    const nowInHighLight = newValue >= ILLUMINANCE_HIGH_READING;
    const nowInLowLight  = newValue < ILLUMINANCE_LOW_THRESHOLD / 2;

    const movedToSun   = wasInLowLight  && nowInHighLight && plantNeededMoreLight(entityId, baseline);
    const movedFromSun = !wasInLowLight && nowInLowLight  && plantHadTooMuchLight(entityId, baseline);

    if (!movedToSun && !movedFromSun) return;
    movePlant(entityId, haTimestamp, movedToSun);
    // Update baseline so subsequent readings don't re-trigger the same move
    illuminanceBaselines.set(entityId, newValue);
}

// ── Real-time event subscription ──────────────────────────────────────────────

haEvents.addListener('sensor_changed', ({ plantId, sensorType, oldValue, newValue, timestamp }) => {
    if (sensorType === 'moisture') {
        processMoistureDelta(plantId, oldValue, newValue, timestamp);
    } else if (sensorType === 'illuminance') {
        processIlluminanceDelta(plantId, oldValue, newValue, timestamp);
    }
});

// ── Catch-up history processing ───────────────────────────────────────────────

haEvents.addListener('history', ({ historyData, sensorToPlant }) => {
    // Pass 1: compute per-plant illuminance baselines before processing deltas
    for (const [sensorEntityId, entries] of Object.entries(historyData)) {
        if (!entries || entries.length < 5) continue;
        const sensorMeta = sensorToPlant[sensorEntityId];
        if (!sensorMeta || sensorMeta.sensorType !== 'illuminance') continue;
        const sorted = [...entries].sort((a, b) => (a.lu ?? 0) - (b.lu ?? 0));
        computeIlluminanceBaseline(sensorMeta.plantId, sorted);
    }

    // Pass 2: process each entity's history chronologically
    for (const [entityId, entries] of Object.entries(historyData)) {
        if (!entries || entries.length < 2) continue;

        const sensorMeta = sensorToPlant[entityId];
        if (!sensorMeta) continue;

        // HA compressed history: s=state value, lu=last_updated (Unix seconds float)
        const sorted = [...entries].sort((a, b) => (a.lu ?? 0) - (b.lu ?? 0));

        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            // Normalise to milliseconds (same as real-time sensor_changed timestamps)
            const timestamp = curr.lu ? curr.lu * 1000 : null;

            const { plantId, sensorType } = sensorMeta;
            const oldValue = parseFloat(prev.s);
            const newValue = parseFloat(curr.s);
            if (isNaN(oldValue) || isNaN(newValue)) continue;

            if (sensorType === 'moisture') {
                processMoistureDelta(plantId, oldValue, newValue, timestamp);
            } else if (sensorType === 'illuminance') {
                processIlluminanceDelta(plantId, oldValue, newValue, timestamp);
            }
        }
    }
});

// ── Cache plant list from live HA data ────────────────────────────────────────

haEvents.addListener('history', () => {
    // After history fires, HA is bootstrapped — snapshot the plant list for offline use
    const plants = Object.entries(plantStates.value).map(([entityId, state]) => ({
        entityId,
        friendlyName: state.attributes?.friendly_name || entityId,
        areaId: plantAreaIds.value[entityId] || null,
    }));
    if (plants.length > 0) cachedPlants.value = plants;
});

// ── Public API ────────────────────────────────────────────────────────────────

export function petPlant(entityId) {
    const data = getPlantData(entityId);
    if (Date.now() - data.lastPetted < PET_COOLDOWN_MS) return false;

    accountBalance.value += 2;
    data.lastPetted = Date.now();
    savePlantData(entityId, data);
    events.emit('plant-petted', { entityId, coins: 2 });
    return true;
}

export function canPetPlant(entityId) {
    const data = getPlantData(entityId);
    return Date.now() - data.lastPetted >= PET_COOLDOWN_MS;
}

/**
 * Assess a sensor reading using the *_status attributes provided by the HA
 * Plant integration (which sources ranges from OpenPlantbook).
 * Status values from HA: 'ok' | 'Low' | 'High' | null
 * @param {string} entityId  — plant.* entity id
 * @param {'moisture'|'temperature'|'illuminance'|'conductivity'} key
 * @returns {'good'|'warn'|'bad'|'unknown'}
 */
export function assessSensor(entityId, key) {
    const attrs = plantStates.value[entityId]?.attributes;
    const status = attrs?.[`${key}_status`];
    if (status == null) return 'unknown';
    const lower = status.toLowerCase();
    if (lower === 'ok') return 'good';
    if (lower === 'low' || lower === 'high') return 'bad';
    return 'unknown';
}

export function getPlantInteraction(entityId) {
    return getPlantData(entityId);
}

export { plantInteractions };
