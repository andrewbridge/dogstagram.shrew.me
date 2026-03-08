import { css } from 'goober';
import RetroButton from './RetroButton.mjs';
import { petPlant, canPetPlant, assessSensor, assessLight, sensorHistory } from '../services/plantData.mjs';
import { sunAboveHorizon } from '../services/homeAssistant.mjs';

const ASSESS_COLOUR = {
    good:    '#60c060',
    warn:    '#c09030',
    bad:     '#e06060',
    unknown: '#909090',
};

const styles = css`
    & {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        font-family: "Press Start 2P", cursive;
    }

    & .detail-hero {
        display: flex;
        justify-content: center;
        padding: 2vh 0 0;
        margin-bottom: -4vh;
        z-index: 1;
    }

    & .detail-content {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        height: 100%;
        padding: 3vh;
        gap: 2vh;
        background: #fff;
        border-top-left-radius: 1.5em;
        border-top-right-radius: 1.5em;
    }

    & .hero-emoji { height: 20vh; image-rendering: pixelated; }

    & .sensor-section {
        display: flex;
        flex-direction: column;
        gap: 1.5vh;
    }

    & .sensor-row {
        display: flex;
        align-items: center;
        gap: 1.5vh;
        font-size: 1.7vh;
    }

    & .sensor-icon  { width: 2.5vh; text-align: center; flex-shrink: 0; }
    & .sensor-label { flex-grow: 1; font-size: 1.4vh; }
    & .sensor-value { font-size: 1.7vh; }

    & .sun-row {
        font-size: 1.3vh;
        text-align: center;
    }

    & .no-sensors {
        font-size: 1.3vh;
        text-align: center;
    }

    & .pet-section {
        display: flex;
        justify-content: center;
        padding: 1vh 0 2vh;
    }

    & .pet-btn { font-size: 1.5vh; }

    & .faux-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    & .tabs {
        display: flex;
        gap: 0;
        border-bottom: .3vh solid rgba(0, 0, 0, 0.1);
        margin-bottom: 1vh;
        z-index: 1;
    }

    & .tab {
        flex: 1;
        background: none;
        border: none;
        font-family: "Press Start 2P", cursive;
        font-size: 1.2vh;
        padding: 1.2vh 0;
        cursor: pointer;
        color: rgba(0, 0, 0, 0.35);
        border-bottom: .3vh solid transparent;
        margin-bottom: -.3vh;
        transition: color 0.2s;
        &.active {
            color: #1b1b1b;
            border-bottom-color: #1b1b1b;
        }
    }

    & .graph-section {
        display: flex;
        flex-direction: column;
        gap: 2.5vh;
    }

    & .graph-card {
        display: flex;
        flex-direction: column;
        gap: 0.8vh;
        margin-bottom: 4vh;
    }

    & .graph-label {
        font-size: 1.2vh;
        color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        gap: 0.8vh;
    }

    & .graph-empty {
        font-size: 1.1vh;
        color: rgba(0, 0, 0, 0.3);
        text-align: center;
        padding: 3vh 0;
    }

    & .chart-wrap {
        height: 12vh;
        position: relative;
    }

    & .chart-wrap .charts-css {
        height: 100%;
        width: 100%;
        --color: var(--chart-color, #60a0c0);
        --line-size: 2px;
    }

    & .chart-wrap .charts-css td {
        border: none;
    }

    & .chart-range {
        display: flex;
        justify-content: space-between;
        font-size: 0.9vh;
        color: rgba(0, 0, 0, 0.3);
        padding-top: 0.3vh;
    }
`;

export default {
    name: 'PlantDetail',
    components: { RetroButton },
    props: {
        plant: { type: Object, required: true },
    },
    data: () => ({
        sunAboveHorizon,
        sensorHistory,
        timeNow: Date.now(),
        activeTab: 'stats',
    }),
    computed: {
        plantHistory() {
            return this.sensorHistory[this.plant.entityId] || null;
        },
        hasGraphData() {
            const h = this.plantHistory;
            if (!h) return false;
            return h.moisture.length > 0 || h.illuminance.length > 0
                || h.temperature.length > 0 || h.conductivity.length > 0;
        },
        graphs() {
            const h = this.plantHistory;
            if (!h) return [];
            const defs = [
                { key: 'moisture',      icon: '💧', label: 'Moisture',      colour: '#4090d0', min: 0,  max: 100 },
                { key: 'illuminance',   icon: '☀️', label: 'Light',         colour: '#c0a030', min: 0,  max: 5000 },
                { key: 'temperature',   icon: '🌡',  label: 'Temperature',   colour: '#d06040', min: 0,  max: 40 },
                { key: 'conductivity',  icon: '🧪', label: 'Conductivity',  colour: '#60a060', min: 0,  max: 2000 },
            ];
            return defs
                .filter(d => h[d.key] && h[d.key].length >= 2)
                .map(d => {
                    const points = h[d.key];
                    const range = d.max - d.min || 1;

                    const rows = [];
                    for (let i = 0; i < points.length; i++) {
                        const start = i === 0 ? (points[i].v - d.min) / range : (points[i - 1].v - d.min) / range;
                        const end = (points[i].v - d.min) / range;
                        rows.push({ start: Math.max(0, Math.min(1, start)), end: Math.max(0, Math.min(1, end)) });
                    }
                    return {
                        ...d,
                        rows,
                        minLabel: this.formatSensor(d.min, d.key),
                        maxLabel: this.formatSensor(d.max, d.key),
                    };
                });
        },
    },
    methods: {
        sensorColour(entityId, key) {
            if (key === 'illuminance' && !this.sunAboveHorizon) return '#606080';
            return ASSESS_COLOUR[assessSensor(entityId, key)] || ASSESS_COLOUR.unknown;
        },

        formatSensor(value, key) {
            if (value === null) return '—';
            if (key === 'moisture')     return Math.round(value) + '%';
            if (key === 'illuminance')  return Math.round(value) + ' lx';
            if (key === 'temperature')  return value.toFixed(1) + '°';
            if (key === 'conductivity') return Math.round(value) + ' µS';
            return String(value);
        },

        lightAssessment(entityId) {
            const result = assessLight(entityId);
            if (result === 'needs-more-light') return { icon: '☀️', text: 'Needs more light', colour: ASSESS_COLOUR.bad };
            if (result === 'needs-more-shade')  return { icon: '🌙', text: 'Needs more shade', colour: ASSESS_COLOUR.bad };
            if (result === 'enough-light')      return { icon: '✅', text: 'Getting enough light', colour: ASSESS_COLOUR.good };
            return null;
        },

        isPettable(entityId) {
            this.timeNow;
            return canPetPlant(entityId);
        },

        handlePet(entityId) {
            if (!this.isPettable(entityId)) return;
            petPlant(entityId);
        },
    },
    mounted() {
        this._tick = setInterval(() => { this.timeNow = Date.now(); }, 5000);
    },
    unmounted() {
        clearInterval(this._tick);
    },
    template: /* html */`
    <div class="${styles}">

        <div class="detail-hero">
            <img class="hero-emoji" :src="plant.image" :alt="plant.friendlyName" />
        </div>

        <div class="detail-content">

            <div v-if="hasGraphData" class="tabs">
                <button class="tab" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">Stats</button>
                <button class="tab" :class="{ active: activeTab === 'graphs' }" @click="activeTab = 'graphs'">Graphs</button>
            </div>

            <!-- ── Stats tab ── -->
            <template v-if="activeTab === 'stats'">
                <div v-if="plant.moisture !== null || plant.illuminance !== null || plant.temperature !== null || plant.conductivity !== null" class="sensor-section">
                    <div v-if="plant.moisture !== null" class="sensor-row">
                        <span class="sensor-icon">💧</span>
                        <span class="sensor-label">Moisture</span>
                        <span class="sensor-value" :style="{ color: sensorColour(plant.entityId, 'moisture') }">
                            {{ formatSensor(plant.moisture, 'moisture') }}
                        </span>
                    </div>
                    <div v-if="plant.temperature !== null" class="sensor-row">
                        <span class="sensor-icon">🌡</span>
                        <span class="sensor-label">Temperature</span>
                        <span class="sensor-value" :style="{ color: sensorColour(plant.entityId, 'temperature') }">
                            {{ formatSensor(plant.temperature, 'temperature') }}
                        </span>
                    </div>
                    <div v-if="plant.illuminance !== null" class="sensor-row">
                        <span class="sensor-icon">{{ sunAboveHorizon ? '☀️' : '🌙' }}</span>
                        <span class="sensor-label">Light</span>
                        <span class="sensor-value" :style="{ color: sensorColour(plant.entityId, 'illuminance') }">
                            {{ formatSensor(plant.illuminance, 'illuminance') }}
                        </span>
                    </div>
                    <div v-if="plant.conductivity !== null" class="sensor-row">
                        <span class="sensor-icon">🧪</span>
                        <span class="sensor-label">Conductivity</span>
                        <span class="sensor-value" :style="{ color: sensorColour(plant.entityId, 'conductivity') }">
                            {{ formatSensor(plant.conductivity, 'conductivity') }}
                        </span>
                    </div>
                </div>
                <p v-else class="no-sensors">No sensor data</p>

                <div v-if="lightAssessment(plant.entityId)" class="sun-row" :style="{ color: lightAssessment(plant.entityId).colour }">
                    <template v-if="sunAboveHorizon">
                        {{ lightAssessment(plant.entityId).icon }}
                    </template>
                    {{ lightAssessment(plant.entityId).text }}
                    <template v-if="!sunAboveHorizon">
                        (based on recent days)
                    </template>
                </div>

                <div class="pet-section">
                    <RetroButton
                        class="pet-btn"
                        variant="warning"
                        :class="{ 'faux-disabled': !isPettable(plant.entityId) }"
                        @click="handlePet(plant.entityId)"
                    >🤚 Pet +2</RetroButton>
                </div>
            </template>

            <!-- ── Graphs tab ── -->
            <template v-if="activeTab === 'graphs'">
                <div v-if="graphs.length > 0" class="graph-section">
                    <div v-for="g in graphs" :key="g.key" class="graph-card">
                        <span class="graph-label">{{ g.icon }} {{ g.label }}</span>
                        <div class="chart-wrap" :style="{ '--chart-color': g.colour }">
                            <table class="charts-css line" :class="{ 'show-primary-axis': true, 'show-4-secondary-axes': true }">
                                <tbody>
                                    <tr v-for="(row, i) in g.rows" :key="i">
                                        <td :style="{ '--start': row.start, '--end': row.end }"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="chart-range">
                            <span>{{ g.minLabel }}</span>
                            <span>{{ g.maxLabel }}</span>
                        </div>
                    </div>
                </div>
                <p v-else class="graph-empty">No history data available yet</p>
            </template>

        </div>

    </div>
    `,
}
