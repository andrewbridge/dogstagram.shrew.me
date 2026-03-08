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

// In-memory sensor history for graphs — 2 readings per day (morning + night) over 3 days.
// Reactive so PlantDetail can bind to it.
// Shape: { [plantEntityId]: { moisture: [{t, v}], illuminance: [{t, v}], temperature: [{t, v}], conductivity: [{t, v}] } }
export const sensorHistory = ref({});

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

/**
 * Distil raw history entries into 2 readings per day: a morning sample (9am–12pm)
 * and an afternoon sample (1pm–5pm). Both windows are during daylight hours so
 * illuminance readings are meaningful. If no readings fall in a window, that slot is skipped.
 * Each entry is { t: unixMs, v: number }.
 */
function distilHistory(sortedEntries) {
    // Group entries by calendar date
    const byDay = new Map();
    for (const e of sortedEntries) {
        const val = parseFloat(e.s);
        if (isNaN(val)) continue;
        const d = new Date((e.lu ?? 0) * 1000);
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!byDay.has(dayKey)) byDay.set(dayKey, []);
        byDay.get(dayKey).push({ t: (e.lu ?? 0) * 1000, v: val, h: d.getHours() });
    }

    const result = [];
    for (const entries of byDay.values()) {
        // Morning: median of readings between 9am–12pm
        const morning = entries.filter(e => e.h >= 9 && e.h < 12);
        if (morning.length > 0) {
            morning.sort((a, b) => a.v - b.v);
            const med = morning[Math.floor(morning.length / 2)];
            result.push({ t: med.t, v: med.v });
        }

        // Afternoon: median of readings between 1pm–5pm
        const afternoon = entries.filter(e => e.h >= 13 && e.h < 17);
        if (afternoon.length > 0) {
            afternoon.sort((a, b) => a.v - b.v);
            const med = afternoon[Math.floor(afternoon.length / 2)];
            result.push({ t: med.t, v: med.v });
        }
    }

    result.sort((a, b) => a.t - b.t);
    return result;
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
    const newSensorHistory = {};

    // Pass 1: compute per-plant illuminance baselines + distil graph data
    for (const [sensorEntityId, entries] of Object.entries(historyData)) {
        if (!entries || entries.length < 2) continue;
        const sensorMeta = sensorToPlant[sensorEntityId];
        if (!sensorMeta) continue;

        const sorted = [...entries].sort((a, b) => (a.lu ?? 0) - (b.lu ?? 0));
        const { plantId, sensorType } = sensorMeta;

        // Illuminance baseline (needs ≥5 entries)
        if (sensorType === 'illuminance' && sorted.length >= 5) {
            computeIlluminanceBaseline(plantId, sorted);
        }

        // Distil 2-per-day readings for graphs
        const distilled = distilHistory(sorted);
        if (distilled.length > 0) {
            if (!newSensorHistory[plantId]) {
                newSensorHistory[plantId] = { moisture: [], illuminance: [], temperature: [], conductivity: [] };
            }
            newSensorHistory[plantId][sensorType] = distilled;
        }
    }

    sensorHistory.value = newSensorHistory;

    // Pass 2: process each entity's history chronologically for delta detection
    for (const [entityId, entries] of Object.entries(historyData)) {
        if (!entries || entries.length < 2) continue;

        const sensorMeta = sensorToPlant[entityId];
        if (!sensorMeta) continue;

        const sorted = [...entries].sort((a, b) => (a.lu ?? 0) - (b.lu ?? 0));

        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
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

/**
 * Assess a plant's light situation using the 3-day daytime median baseline
 * compared against the HA Plant integration's min/max illuminance thresholds.
 * The baseline is more reliable than the real-time illuminance_status attribute
 * because it isn't affected by the current time of day.
 * @param {string} entityId — plant.* entity id
 * @returns {'needs-more-light'|'enough-light'|'needs-more-shade'|'unknown'}
 */
export function assessLight(entityId) {
    const baseline = illuminanceBaselines.get(entityId);
    if (baseline === undefined) return 'unknown';
    const attrs = plantStates.value[entityId]?.attributes;
    const min = parseFloat(attrs?.min_illuminance);
    const max = parseFloat(attrs?.max_illuminance);
    if (!isNaN(min) && baseline < min) return 'needs-more-light';
    if (!isNaN(max) && baseline > max) return 'needs-more-shade';
    return 'enough-light';
}

export function getPlantInteraction(entityId) {
    return getPlantData(entityId);
}

export { plantInteractions };
