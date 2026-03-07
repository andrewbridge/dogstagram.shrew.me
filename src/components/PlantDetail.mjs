import { css } from 'goober';
import RetroButton from './RetroButton.mjs';
import { petPlant, canPetPlant, assessSensor } from '../services/plantData.mjs';
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
        overflow-y: auto;
        padding: 2vh;
        display: flex;
        flex-direction: column;
        gap: 1.5vh;
        font-family: "Press Start 2P", cursive;
    }

    & .detail-hero {
        display: flex;
        justify-content: center;
        padding: 2vh 0 1vh;
    }

    & .hero-emoji { font-size: 12vh; }

    & .sensor-section {
        background: rgba(0, 0, 0, 0.2);
        border: .4vh solid rgba(0, 0, 0, 0.3);
        padding: 2vh;
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
    & .sensor-label { flex-grow: 1; color: rgba(255, 255, 255, 0.65); font-size: 1.4vh; }
    & .sensor-value { font-size: 1.7vh; }

    & .sun-row {
        color: rgba(255, 255, 255, 0.65);
        font-size: 1.3vh;
        text-align: center;
    }

    & .no-sensors {
        color: rgba(255, 255, 255, 0.35);
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
`;

export default {
    name: 'PlantDetail',
    components: { RetroButton },
    props: {
        plant: { type: Object, required: true },
    },
    data: () => ({
        sunAboveHorizon,
        timeNow: Date.now(),
    }),
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
            <span class="hero-emoji">{{ plant.emoji }}</span>
        </div>

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

        <div v-if="plant.hasMovedBefore" class="sun-row">
            Currently {{ plant.inSun ? 'in sun 🌞' : 'in shade 🌙' }}
        </div>

        <div class="pet-section">
            <RetroButton
                class="pet-btn"
                variant="warning"
                :class="{ 'faux-disabled': !isPettable(plant.entityId) }"
                @click="handlePet(plant.entityId)"
            >🤚 Pet +2</RetroButton>
        </div>

    </div>
    `,
}
