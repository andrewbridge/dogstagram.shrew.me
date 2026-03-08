import { createApp, ref, computed } from 'vue';
import {
    haUrl, haToken,
    haConnected, haAvailable, haError,
    plantStates, plantAreaIds, haAreas, linkedSensorIds, plantSensorValues,
    sunAboveHorizon, connectToHA, disconnectFromHA,
    haEvents,
} from './services/homeAssistant.mjs';
import { KNOWN_PLANTS } from './constants/plants.mjs';

// ── OpenPlantbook mock data ────────────────────────────────────────────────────
// Paste the raw JSON response from OpenPlantbook for each plant PID below.
// GET https://open.plantbook.io/api/v1/plant/detail/{pid}/ (API key required)
// Fields used: min_soil_moist, max_soil_moist, min_temp, max_temp,
//              min_light_lux, max_light_lux, min_soil_ec, max_soil_ec

const PLANTBOOK_MOCK = {
    'monstera deliciosa': {
        "pid": "monstera deliciosa",
        "display_pid": "Monstera deliciosa",
        "alias": "monstera",
        "category": "Araceae, Monstera",
        "max_light_mmol": 3400,
        "min_light_mmol": 1500,
        "max_light_lux": 15000,
        "min_light_lux": 800,
        "max_temp": 32,
        "min_temp": 12,
        "max_env_humid": 85,
        "min_env_humid": 30,
        "max_soil_moist": 60,
        "min_soil_moist": 15,
        "max_soil_ec": 2000,
        "min_soil_ec": 350,
        "image_url": "https://opb-img.plantbook.io/monstera%20deliciosa.jpg",
        "common_names": [
            {
                "name": "Monstera deliciosa Verigata",
                "language_code": "de"
            },
            {
                "name": "Monstera deliciosa",
                "language_code": "de"
            },
            {
                "name": "Monstera",
                "language_code": "en"
            },
            {
                "name": "Swiss Cheese Plant",
                "language_code": "en"
            },
            {
                "name": "Monstera deliciosa",
                "language_code": "pl"
            },
            {
                "name": "مونستيرا أدانسوني",
                "language_code": "ar"
            },
            {
                "name": "Monstera télé",
                "language_code": "fr"
            },
            {
                "name": "Monstera",
                "language_code": "de"
            },
            {
                "name": "Monstera deliciosa",
                "language_code": "en"
            },
            {
                "name": "Monstera dziurawa",
                "language_code": "pl"
            },
            {
                "name": "Monstera",
                "language_code": "ar"
            },
            {
                "name": "Monstera Zimmer",
                "language_code": "de"
            },
            {
                "name": "Monstera",
                "language_code": "sv"
            },
            {
                "name": "Cheese Plant",
                "language_code": "en"
            },
            {
                "name": "Μονστέρα",
                "language_code": "el"
            }
        ]
    },
    'coffea arabica': {
        "pid": "coffea arabica",
        "display_pid": "Coffea arabica",
        "alias": "coffea arabica",
        "category": "Rubiaceae, Coffea",
        "max_light_mmol": 4000,
        "min_light_mmol": 2000,
        "max_light_lux": 20000,
        "min_light_lux": 3700,
        "max_temp": 32,
        "min_temp": 10,
        "max_env_humid": 80,
        "min_env_humid": 30,
        "max_soil_moist": 60,
        "min_soil_moist": 15,
        "max_soil_ec": 2000,
        "min_soil_ec": 350,
        "image_url": "https://opb-img.plantbook.io/coffea%20arabica.jpg",
        "common_names": [
            {
                "name": "Arabica-Kaffee",
                "language_code": "de"
            },
            {
                "name": "Coffee Plant",
                "language_code": "ar"
            },
            {
                "name": "Coffee",
                "language_code": "ar"
            }
        ]
    }
};

// ── Assessment helpers ────────────────────────────────────────────────────────

// OpenPlantbook field names → app sensor keys
const PB_KEY_MAP = {
    moisture:    { min: 'min_soil_moist', max: 'max_soil_moist' },
    illuminance: { min: 'min_light_lux',  max: 'max_light_lux'  },
    temperature: { min: 'min_temp',       max: 'max_temp'       },
    conductivity:{ min: 'min_soil_ec',    max: 'max_soil_ec'    },
};

function mapPbRanges(raw) {
    if (!raw) return null;
    const out = {};
    for (const [key, fields] of Object.entries(PB_KEY_MAP)) {
        const min = raw[fields.min];
        const max = raw[fields.max];
        if (min != null && max != null) out[key] = { min, max };
    }
    return Object.keys(out).length ? out : null;
}

// Returns: 'too-low' | 'warn-low' | 'ok' | 'warn-high' | 'too-high'
//        | 'night' | 'no-data' | 'no-range'
function assessStatus(value, range, isIlluminance, sunIsUp) {
    if (isIlluminance && !sunIsUp) return 'night';
    if (value === null || value === undefined) return 'no-data';
    if (!range) return 'no-range';
    const { min, max } = range;
    const warn = (max - min) * 0.15;
    if (value < min)        return 'too-low';
    if (value < min + warn) return 'warn-low';
    if (value > max)        return 'too-high';
    if (value > max - warn) return 'warn-high';
    return 'ok';
}

const MOISTURE_STATUS = {
    'no-data':   { label: 'No reading',     colour: '#808080' },
    'no-range':  { label: 'No thresholds',  colour: '#808080' },
    'too-low':   { label: 'Needs watering', colour: '#e06060' },
    'warn-low':  { label: 'Getting dry',    colour: '#c09030' },
    'too-high':  { label: 'Overwatered',    colour: '#e06060' },
    'warn-high': { label: 'Quite wet',      colour: '#c09030' },
    'ok':        { label: 'OK',             colour: '#60c060' },
};

const ILLUMINANCE_STATUS = {
    'night':     { label: '🌙 Night — skipped',    colour: '#6080a0' },
    'no-data':   { label: 'No reading',            colour: '#808080' },
    'no-range':  { label: 'No thresholds',         colour: '#808080' },
    'too-low':   { label: 'Needs more light',      colour: '#e06060' },
    'warn-low':  { label: 'Could be brighter',     colour: '#c09030' },
    'too-high':  { label: 'Needs shade',           colour: '#e06060' },
    'warn-high': { label: 'Quite bright',          colour: '#c09030' },
    'ok':        { label: 'Good light',            colour: '#60c060' },
};

// Compute bar percentages for a CSS range bar.
// Returns { zoneLeft, zoneWidth, markerLeft } as '%' strings (or null if not computable).
function rangeBar(value, range, scaleMin, scaleMax) {
    if (!range) return { zoneLeft: null, zoneWidth: null, markerLeft: null };
    const span = scaleMax - scaleMin;
    const zoneLeft  = ((range.min - scaleMin) / span * 100).toFixed(1) + '%';
    const zoneWidth = ((range.max - range.min) / span * 100).toFixed(1) + '%';
    const markerLeft = value !== null && value !== undefined
        ? (Math.min(Math.max((value - scaleMin) / span * 100, 0), 100)).toFixed(1) + '%'
        : null;
    return { zoneLeft, zoneWidth, markerLeft };
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Track which rows recently changed for the green highlight effect
const recentlyChanged = ref({});

// { [plantId]: [{ at, from, to, delta }] } — moisture jumps ≥ 15 found in 24h history
const wateringHistory = ref({});

haEvents.addListener('sensor_changed', ({ plantId, sensorType, oldValue, newValue, timestamp }) => {
    recentlyChanged.value = { ...recentlyChanged.value, [plantId]: Date.now() };
    setTimeout(() => {
        const updated = { ...recentlyChanged.value };
        delete updated[plantId];
        recentlyChanged.value = updated;
    }, 2000);

    console.log('[sensor_changed]', plantId, sensorType, oldValue, '→', newValue, '@', timestamp);
});

haEvents.addListener('history', ({ historyData, sensorToPlant }) => {
    console.log('[history] received for', Object.keys(historyData).length, 'entities');

    const detected = {};

    for (const [entityId, entries] of Object.entries(historyData)) {
        const meta = sensorToPlant[entityId];
        if (!meta || meta.sensorType !== 'moisture') continue;

        const { plantId } = meta;
        // HA compressed history format: s=state, lu=last_updated (Unix seconds), a=attributes
        const sorted = [...entries].sort((a, b) => (a.lu ?? 0) - (b.lu ?? 0));

        for (let i = 1; i < sorted.length; i++) {
            const from = parseFloat(sorted[i - 1].s);
            const to   = parseFloat(sorted[i].s);
            if (isNaN(from) || isNaN(to)) continue;
            const delta = to - from;
            if (delta >= 15) {
                if (!detected[plantId]) detected[plantId] = [];
                detected[plantId].push({
                    at:    sorted[i].lu * 1000,              // store as milliseconds
                    from:  Math.round(from  * 10) / 10,
                    to:    Math.round(to    * 10) / 10,
                    delta: Math.round(delta * 10) / 10,
                });
            }
        }
    }

    wateringHistory.value = detected;
    console.log('[history] watering events detected:', detected);
});

// ── App component ─────────────────────────────────────────────────────────────

const App = {
    setup() {
        const plants = computed(() => {
            return Object.entries(plantStates.value).map(([deviceId, state]) => {
                const sensors = plantSensorValues.value[deviceId] || {};
                return {
                    entityId:     deviceId,
                    name:         state.attributes?.friendly_name || deviceId,
                    areaId:       plantAreaIds.value[deviceId] || null,
                    area:         haAreas.value[plantAreaIds.value[deviceId]]?.name || '—',
                    moisture:     sensors.moisture     ?? null,
                    temperature:  sensors.temperature  ?? null,
                    illuminance:  sensors.illuminance  ?? null,
                    conductivity: sensors.conductivity ?? null,
                    linkedSensors: linkedSensorIds.value[deviceId] || [],
                    changedAt:    recentlyChanged.value[deviceId] || null,
                };
            });
        });

        const hasAnyMoisture    = computed(() => plants.value.some(p => p.moisture    !== null));
        const hasAnyIlluminance = computed(() => plants.value.some(p => p.illuminance !== null));
        const hasAnyAreas       = computed(() => plants.value.some(p => p.area        !== '—'));

        // Flat list of all watering events across all plants, newest first
        const wateredPlants = computed(() => {
            const rows = [];
            for (const [plantId, events] of Object.entries(wateringHistory.value)) {
                const state = plantStates.value[plantId];
                const name  = state?.attributes?.friendly_name || plantId;
                const area  = haAreas.value[plantAreaIds.value[plantId]]?.name || '—';
                for (const e of events) rows.push({ plantId, name, area, ...e });
            }
            return rows.sort((a, b) => b.at < a.at ? -1 : 1);
        });

        // Plant health assessment — uses PLANTBOOK_MOCK static data and live sensor values
        const plantHealth = computed(() => {
            const sunIsUp = sunAboveHorizon.value;
            return plants.value.map(p => {
                const openPlantbookPid = KNOWN_PLANTS[p.entityId]?.openPlantbookPid || null;
                const raw    = openPlantbookPid ? PLANTBOOK_MOCK[openPlantbookPid] : null;
                const ranges = mapPbRanges(raw);

                const luxScaleMax = ranges?.illuminance ? ranges.illuminance.max * 2 : 10000;

                const moistureKey    = assessStatus(p.moisture,    ranges?.moisture    ?? null, false, sunIsUp);
                const illuminanceKey = assessStatus(p.illuminance, ranges?.illuminance ?? null, true,  sunIsUp);

                return {
                    entityId:           p.entityId,
                    name:               p.name,
                    area:               p.area,
                    moisture:           p.moisture,
                    illuminance:        p.illuminance,
                    temperature:        p.temperature,
                    openPlantbookPid,
                    hasRanges:          !!ranges,
                    ranges,
                    moistureKey,
                    illuminanceKey,
                    moistureStatus:     MOISTURE_STATUS[moistureKey],
                    illuminanceStatus:  ILLUMINANCE_STATUS[illuminanceKey],
                    moistureBar:        rangeBar(p.moisture,    ranges?.moisture    ?? null, 0,          100),
                    illuminanceBar:     rangeBar(p.illuminance, ranges?.illuminance ?? null, 0, luxScaleMax),
                };
            });
        });

        return {
            haUrl, haToken,
            haConnected, haAvailable, haError,
            connectToHA, disconnectFromHA,
            plants, hasAnyMoisture, hasAnyIlluminance, hasAnyAreas,
            wateredPlants,
            sunAboveHorizon,
            plantHealth,
        };
    },

    template: /* html */`
        <div>
            <h1>🏠 Home Assistant — Live Plant Sensor Test</h1>

            <div>
                <label>HA URL (e.g. http://192.168.1.x:8123)</label>
                <input v-model="haUrl" placeholder="http://homeassistant.local:8123" />
            </div>
            <div>
                <label>Long-lived access token</label>
                <input v-model="haToken" type="password" placeholder="eyJ..." />
            </div>
            <div>
                <button @click="connectToHA" :disabled="!haUrl || !haToken">Connect</button>
                <button @click="disconnectFromHA">Disconnect</button>
                <span class="status" :class="haConnected ? 'connected' : 'disconnected'">
                    {{ haConnected ? '● Connected' : '○ Disconnected' }}
                </span>
                <span v-if="haAvailable && !haConnected" class="status disconnected">reconnecting…</span>
            </div>

            <div v-if="haError" class="error">⚠ {{ haError }}</div>

            <section v-if="plants.length">
                <h2>Plant devices ({{ plants.length }}) — discovered from sensor groupings</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Device ID</th>
                            <th>Area ID</th>
                            <th>Area</th>
                            <th>💧 Moisture</th>
                            <th>🌡 Temp</th>
                            <th>☀️ Illuminance</th>
                            <th>🧪 Conductivity</th>
                            <th>Linked sensors</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="p in plants" :key="p.entityId" :class="{ highlight: !!p.changedAt }">
                            <td>{{ p.name }}</td>
                            <td><code>{{ p.entityId }}</code></td>
                            <td><code>{{ p.areaId || '—' }}</code></td>
                            <td>{{ p.area }}</td>
                            <td>{{ p.moisture     !== null ? p.moisture     + '%'      : '—' }}</td>
                            <td>{{ p.temperature  !== null ? p.temperature  + '°'      : '—' }}</td>
                            <td>{{ p.illuminance  !== null ? p.illuminance  + ' lx'    : '—' }}</td>
                            <td>{{ p.conductivity !== null ? p.conductivity + ' µS/cm' : '—' }}</td>
                            <td><pre>{{ p.linkedSensors.join('\\n') || '—' }}</pre></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section v-else-if="haAvailable">
                <p style="color:#808080">
                    No plant sensor devices found. Devices need at least a moisture or illuminance sensor
                    to be detected. Check browser console for raw device/entity data.
                </p>
            </section>

            <section v-if="haAvailable && plants.length">
                <h2>Validation checklist</h2>
                <ul style="padding-left:20px;line-height:2">
                    <li style="color:#60c060">✅ Connected successfully</li>
                    <li :style="{ color: hasAnyAreas ? '#60c060' : '#e06060' }">
                        {{ hasAnyAreas ? '✅' : '❌' }} Area names resolved
                    </li>
                    <li :style="{ color: hasAnyMoisture ? '#60c060' : '#e06060' }">
                        {{ hasAnyMoisture ? '✅' : '❌' }} Moisture readings visible
                        <span v-if="!hasAnyMoisture" style="color:#a06060">
                            — check browser console; the device_class on moisture sensor entities may differ from expected
                        </span>
                    </li>
                    <li :style="{ color: hasAnyIlluminance ? '#60c060' : '#e06060' }">
                        {{ hasAnyIlluminance ? '✅' : '❌' }} Illuminance readings visible
                    </li>
                    <li style="color:#a0a0a0">⏳ Water a plant — the row should highlight green within ~30 s</li>
                </ul>
            </section>

            <section v-if="haAvailable">
                <h2>💧 Watered in last 24h (moisture jump ≥ 15%)</h2>
                <p v-if="!wateredPlants.length" style="color:#808080;padding:8px 0">
                    None detected — either no plants were watered, or history hasn't loaded yet.
                </p>
                <table v-else>
                    <thead>
                        <tr>
                            <th>Plant</th>
                            <th>Area</th>
                            <th>Time</th>
                            <th>From → To</th>
                            <th>Jump</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="e in wateredPlants" :key="e.plantId + e.at">
                            <td>{{ e.name }}</td>
                            <td>{{ e.area }}</td>
                            <td>{{ new Date(e.at).toLocaleTimeString() }} {{ new Date(e.at).toLocaleDateString() }}</td>
                            <td>{{ e.from }}% → {{ e.to }}%</td>
                            <td style="color:#60c060">+{{ e.delta }}%</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section v-if="haAvailable && plantHealth.length">
                <h2>🌿 Plant Health Assessment</h2>
                <p style="color:#606060;margin-bottom:14px">
                    Sun is currently
                    <span :style="{color: sunAboveHorizon ? '#c0c040' : '#6080a0'}">
                        {{ sunAboveHorizon ? '☀️ above horizon' : '🌙 below horizon' }}
                    </span>
                    — illuminance assessment is suppressed at night.
                </p>
                <div v-for="p in plantHealth" :key="p.entityId" class="health-card">
                    <p class="health-card-title">
                        {{ p.name }}
                        <span style="color:#505060"> — {{ p.area }}</span>
                        <span style="color:#406080;font-size:11px;margin-left:10px">{{ p.openPlantbookPid || '(unrecognised)' }}</span>
                    </p>

                    <p v-if="!p.openPlantbookPid" style="color:#808080;font-style:italic;font-size:11px">
                        Not matched in KNOWN_PLANTS — add an entry in src/constants/plants.mjs with the OpenPlantbook pid
                    </p>
                    <p v-else-if="!p.hasRanges" style="color:#808080;font-style:italic;font-size:11px">
                        Paste the OpenPlantbook JSON for <b style="color:#a0b0c0">{{ p.openPlantbookPid }}</b>
                        into <b style="color:#a0b0c0">PLANTBOOK_MOCK</b> in src/ha-test.mjs
                    </p>

                    <template v-else>
                        <!-- Moisture -->
                        <div class="sensor-bar-row">
                            <span class="bar-label">💧 Moisture</span>
                            <span class="bar-reading">{{ p.moisture !== null ? p.moisture.toFixed(1) + '%' : '—' }}</span>
                            <div class="range-bar">
                                <div class="range-zone" :style="{left: p.moistureBar.zoneLeft, width: p.moistureBar.zoneWidth}"></div>
                                <div class="range-marker" v-if="p.moistureBar.markerLeft !== null" :style="{left: p.moistureBar.markerLeft}"></div>
                            </div>
                            <span class="bar-range">{{ p.ranges.moisture.min }}–{{ p.ranges.moisture.max }}%</span>
                            <span :style="{color: p.moistureStatus.colour}">{{ p.moistureStatus.label }}</span>
                        </div>

                        <!-- Illuminance (suppressed at night) -->
                        <div class="sensor-bar-row">
                            <span class="bar-label">☀️ Light</span>
                            <span class="bar-reading">{{ p.illuminance !== null ? Math.round(p.illuminance) + ' lx' : '—' }}</span>
                            <template v-if="p.illuminanceKey === 'night'">
                                <span :style="{color: p.illuminanceStatus.colour}">{{ p.illuminanceStatus.label }}</span>
                            </template>
                            <template v-else>
                                <div class="range-bar">
                                    <div class="range-zone" :style="{left: p.illuminanceBar.zoneLeft, width: p.illuminanceBar.zoneWidth}"></div>
                                    <div class="range-marker" v-if="p.illuminanceBar.markerLeft !== null" :style="{left: p.illuminanceBar.markerLeft}"></div>
                                </div>
                                <span class="bar-range">{{ p.ranges.illuminance.min }}–{{ p.ranges.illuminance.max }} lx</span>
                                <span :style="{color: p.illuminanceStatus.colour}">{{ p.illuminanceStatus.label }}</span>
                            </template>
                        </div>

                        <!-- Temperature (no bar — just reading vs range) -->
                        <div class="sensor-bar-row" v-if="p.temperature !== null && p.ranges.temperature">
                            <span class="bar-label">🌡 Temp</span>
                            <span class="bar-reading">{{ p.temperature.toFixed(1) }}°C</span>
                            <span class="bar-range">(range {{ p.ranges.temperature.min }}–{{ p.ranges.temperature.max }}°C)</span>
                        </div>
                    </template>
                </div>
            </section>
        </div>
    `,
};

createApp(App).mount('#root');
