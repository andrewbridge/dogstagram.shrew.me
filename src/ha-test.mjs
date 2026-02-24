import { createApp, ref, computed } from 'vue';
import {
    haUrl, haToken,
    haConnected, haAvailable, haError,
    plantStates, plantAreaNames, linkedSensorIds, plantSensorValues,
    isHaConfigured, connectToHA, disconnectFromHA,
    haEvents,
} from './services/homeAssistant.mjs';

// Track which rows recently changed for the highlight effect
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
                    at: sorted[i].lu * 1000,  // store as milliseconds
                    from: Math.round(from * 10) / 10,
                    to:   Math.round(to   * 10) / 10,
                    delta: Math.round(delta * 10) / 10,
                });
            }
        }
    }

    wateringHistory.value = detected;
    console.log('[history] watering events detected:', detected);
});

const App = {
    setup() {
        const plants = computed(() => {
            return Object.entries(plantStates.value).map(([deviceId, state]) => {
                const sensors = plantSensorValues.value[deviceId] || {};
                return {
                    entityId: deviceId,
                    name: state.attributes?.friendly_name || deviceId,
                    area: plantAreaNames.value[deviceId] || '—',
                    moisture:     sensors.moisture     ?? null,
                    temperature:  sensors.temperature  ?? null,
                    illuminance:  sensors.illuminance  ?? null,
                    conductivity: sensors.conductivity ?? null,
                    linkedSensors: linkedSensorIds.value[deviceId] || [],
                    changedAt: recentlyChanged.value[deviceId] || null,
                };
            });
        });

        const hasAnyMoisture = computed(() => plants.value.some(p => p.moisture !== null));
        const hasAnyIlluminance = computed(() => plants.value.some(p => p.illuminance !== null));
        const hasAnyAreas = computed(() => plants.value.some(p => p.area !== '—'));

        // Flat list of all watering events across all plants, newest first
        const wateredPlants = computed(() => {
            const rows = [];
            for (const [plantId, events] of Object.entries(wateringHistory.value)) {
                const state = plantStates.value[plantId];
                const name = state?.attributes?.friendly_name || plantId;
                const area = plantAreaNames.value[plantId] || '—';
                for (const e of events) {
                    rows.push({ plantId, name, area, ...e });
                }
            }
            return rows.sort((a, b) => b.at < a.at ? -1 : 1);
        });

        return {
            haUrl, haToken,
            haConnected, haAvailable, haError,
            connectToHA, disconnectFromHA,
            plants, hasAnyMoisture, hasAnyIlluminance, hasAnyAreas,
            wateredPlants,
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
                            <td>{{ p.area }}</td>
                            <td>{{ p.moisture !== null ? p.moisture + '%' : '—' }}</td>
                            <td>{{ p.temperature !== null ? p.temperature + '°' : '—' }}</td>
                            <td>{{ p.illuminance !== null ? p.illuminance + ' lx' : '—' }}</td>
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
        </div>
    `,
};

createApp(App).mount('#root');
