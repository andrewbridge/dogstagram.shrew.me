import { css } from 'goober';
import RetroButton from '../components/RetroButton.mjs';
import RetroToast from '../components/RetroToast.mjs';
import MinimalInput from '../components/MinimalInput.mjs';
import {
    haUrl, haToken, haAvailable, haError,
    plantStates, plantAreaIds, haAreas, plantSensorValues, sunAboveHorizon,
    isHaConfigured, connectToHA, disconnectFromHA,
} from '../services/homeAssistant.mjs';
import {
    cachedPlants, plantInteractions,
    petPlant, canPetPlant, assessSensor,
} from '../services/plantData.mjs';
import { events } from '../services/data.mjs';
import { KNOWN_ROOMS, KNOWN_PLANTS, DEFAULT_ROOM, DEFAULT_PLANT } from '../constants/plants.mjs';

// Assessment result → CSS colour
const ASSESS_COLOUR = {
    good:    '#60c060',
    warn:    '#c09030',
    bad:     '#e06060',
    unknown: '#909090',
};

const styles = css`
    & {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: "Press Start 2P", cursive;
        background: var(--room-wall, #d0ccc8);
        position: relative;
        overflow: hidden;
    }

    & .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5vh 2vh;
        background: rgba(0, 0, 0, 0.35);
        color: white;
        flex-shrink: 0;
        position: relative;
        z-index: 1;
        &::before, &::after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            box-sizing: content-box;
            pointer-events: none;
        }
        &::before {
            top: -.5vh;
            left: 0;
            border-top: .5vh black solid;
            border-bottom: .5vh black solid;
        }
        &::after {
            left: -.5vh;
            top: 0;
            border-left: .5vh black solid;
            border-right: .5vh black solid;
        }
    }

    & .nav-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 3vh;
        padding: 0 0.5vh;
        color: white;
        line-height: 1;
        position: relative;
    }

    & .page-title {
        font-size: 1.8vh;
        text-align: center;
    }

    & .header-emoji { font-size: 3vh; }

    & .todo-badge {
        position: absolute;
        top: -.4vh;
        right: -.4vh;
        background: #e06060;
        color: white;
        font-size: 1vh;
        border-radius: 50%;
        width: 1.8vh;
        height: 1.8vh;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
    }

    & .status-strip {
        background: rgba(0, 0, 0, 0.4);
        color: rgba(255, 255, 255, 0.75);
        font-size: 1.3vh;
        padding: 1.2vh 2vh;
        text-align: center;
        flex-shrink: 0;
        line-height: 2;
        border-bottom: .4vh solid black;
    }

    /* ── List view ── */

    & .plants-scroll {
        flex-grow: 1;
        overflow-y: auto;
    }

    & .ha-setup {
        background: rgba(0, 0, 0, 0.45);
        border: .4vh solid rgba(0, 0, 0, 0.5);
        padding: 2vh;
        margin: 2vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5vh;
        color: white;
        font-size: 1.4vh;
        text-align: center;
        line-height: 2;
    }

    & .ha-connect-btn { font-size: 1.4vh; }

    & .empty-state {
        color: rgba(0, 0, 0, 0.4);
        font-size: 1.5vh;
        text-align: center;
        padding: 4vh 2vh;
        line-height: 2;
    }

    & .room-section { margin-bottom: 1vh; }

    & .room-header {
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.9);
        font-size: 1.4vh;
        padding: 1vh 2vh;
        border-top: .3vh solid rgba(0, 0, 0, 0.5);
        border-bottom: .3vh solid rgba(0, 0, 0, 0.5);
    }

    & .plant-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5vh;
        padding: 1.5vh 2vh;
    }

    & .plant-card {
        background: rgba(0, 0, 0, 0.18);
        border: .4vh solid rgba(0, 0, 0, 0.25);
        padding: 2vh 1vh 1.5vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1vh;
        cursor: pointer;
        &:active { opacity: 0.7; }
    }

    & .card-emoji { font-size: 5vh; }

    & .card-name {
        font-size: 1.1vh;
        color: white;
        text-align: center;
        word-break: break-word;
        line-height: 1.6;
    }

    & .card-status {
        width: 1.4vh;
        height: 1.4vh;
        border-radius: 50%;
        border: .2vh solid rgba(0, 0, 0, 0.3);
        &.status-ok      { background: #60c060; }
        &.status-problem { background: #e06060; }
        &.status-unknown { background: #909090; }
    }

    /* ── Detail view ── */

    & .detail-scroll {
        flex-grow: 1;
        overflow-y: auto;
        padding: 2vh;
        display: flex;
        flex-direction: column;
        gap: 1.5vh;
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

    /* ── Todo overlay ── */

    & .todo-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        z-index: 10;
    }

    & .todo-panel {
        background: var(--room-wall, #d0ccc8);
        border-top: .5vh solid black;
        max-height: 70%;
        display: flex;
        flex-direction: column;
    }

    & .todo-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5vh 2vh;
        background: rgba(0, 0, 0, 0.35);
        color: white;
        flex-shrink: 0;
        border-bottom: .4vh solid black;
    }

    & .todo-title { font-size: 1.6vh; }

    & .todo-close-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 2.5vh;
        color: white;
        line-height: 1;
        padding: 0 0.5vh;
    }

    & .todo-body {
        overflow-y: auto;
        padding: 1.5vh 2vh;
        display: flex;
        flex-direction: column;
        gap: 1.5vh;
    }

    & .todo-empty {
        color: rgba(0, 0, 0, 0.5);
        font-size: 1.4vh;
        text-align: center;
        padding: 3vh 0;
        line-height: 2;
    }

    & .todo-item {
        display: flex;
        align-items: center;
        gap: 1.5vh;
        background: rgba(0, 0, 0, 0.12);
        border: .3vh solid rgba(0, 0, 0, 0.2);
        padding: 1.5vh;
        cursor: pointer;
        &:active { opacity: 0.7; }
        &.todo-done { opacity: 0.45; }
    }

    & .todo-plant-emoji { font-size: 3.5vh; flex-shrink: 0; }

    & .todo-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        gap: 0.7vh;
    }

    & .todo-plant-name  { font-size: 1.3vh; color: rgba(0, 0, 0, 0.8); }
    & .todo-action-label { font-size: 1.2vh; color: rgba(0, 0, 0, 0.55); }

    & .todo-check {
        font-size: 2.5vh;
        color: #60c060;
        flex-shrink: 0;
        width: 2.5vh;
        text-align: center;
    }

    & .toast { font-size: 2.5vh; }
`;

export default {
    name: 'Plants',
    inject: ['router'],
    components: { RetroButton, RetroToast, MinimalInput },
    data: () => ({
        // HA reactive refs (unwrapped via Options API data())
        haUrl, haToken, haAvailable, haError,
        plantStates, plantAreaIds, haAreas, plantSensorValues, sunAboveHorizon,
        // Plant data reactive refs
        cachedPlants, plantInteractions,
        // Local UI state
        view: 'list',          // 'list' | 'detail'
        selectedPlantId: null,
        showTodo: false,
        mountedAt: 0,
        toastText: '',
        toastShown: false,
        // Tick ref to trigger cooldown re-evaluation every 5 s
        timeNow: Date.now(),
    }),

    computed: {
        isConfigured() { return isHaConfigured(); },

        hasLiveData() {
            return Object.keys(this.plantStates).length > 0;
        },

        // Unified plant list: live HA data when available, else persisted cache
        allPlants() {
            const source = this.hasLiveData
                ? Object.entries(this.plantStates).map(([entityId, state]) => ({
                    entityId,
                    friendlyName: state.attributes?.friendly_name || entityId,
                    areaId: this.plantAreaIds[entityId] || null,
                }))
                : this.cachedPlants.map(p => ({
                    entityId: p.entityId,
                    friendlyName: p.friendlyName,
                    areaId: p.areaId || null,
                }));

            return source.map(({ entityId, friendlyName, areaId }) => {
                const { emoji } = KNOWN_PLANTS[entityId] ?? DEFAULT_PLANT;
                const sensors     = this.plantSensorValues[entityId] || {};
                const interaction = this.plantInteractions[entityId];
                return {
                    entityId,
                    friendlyName,
                    areaId,
                    emoji,
                    moisture:       sensors.moisture     ?? null,
                    temperature:    sensors.temperature  ?? null,
                    illuminance:    sensors.illuminance  ?? null,
                    conductivity:   sensors.conductivity ?? null,
                    inSun:          interaction?.inSun ?? false,
                    hasMovedBefore: interaction ? interaction.lastMoved > 0 : false,
                };
            });
        },

        // Plants grouped by room, preserving KNOWN_ROOMS order then unknown areas
        plantsByRoom() {
            const groups = new Map();
            // Seed with KNOWN_ROOMS order first so they appear in definition order
            for (const areaId of Object.keys(KNOWN_ROOMS)) {
                groups.set(areaId, {
                    areaId,
                    name: this.haAreas[areaId]?.name || areaId,
                    plants: [],
                });
            }
            for (const plant of this.allPlants) {
                const key = plant.areaId || '__unknown__';
                if (!groups.has(key)) {
                    groups.set(key, {
                        areaId: plant.areaId,
                        name: plant.areaId ? (this.haAreas[plant.areaId]?.name || plant.areaId) : 'Unknown',
                        plants: [],
                    });
                }
                groups.get(key).plants.push(plant);
            }
            // Drop empty room buckets
            return [...groups.values()].filter(g => g.plants.length > 0);
        },

        // To-do items: plants whose HA status indicates they need attention
        todoItems() {
            if (!this.hasLiveData) return [];
            return this.allPlants.flatMap(plant => {
                const attrs       = this.plantStates[plant.entityId]?.attributes || {};
                const interaction = this.plantInteractions[plant.entityId] || {};
                const items       = [];

                const moistureStatus    = attrs.moisture_status?.toLowerCase();
                const illuminanceStatus = attrs.illuminance_status?.toLowerCase();

                if (moistureStatus === 'low') {
                    items.push({
                        entityId: plant.entityId,
                        name:     plant.friendlyName,
                        emoji:    plant.emoji,
                        action:   'water',
                        icon:     '💧',
                        label:    'Needs watering',
                        done:     (interaction.lastWatered || 0) > this.mountedAt,
                    });
                }
                if (illuminanceStatus === 'low') {
                    items.push({
                        entityId: plant.entityId,
                        name:     plant.friendlyName,
                        emoji:    plant.emoji,
                        action:   'move-sun',
                        icon:     '☀️',
                        label:    'Needs more light',
                        done:     (interaction.lastMoved || 0) > this.mountedAt,
                    });
                }
                if (illuminanceStatus === 'high') {
                    items.push({
                        entityId: plant.entityId,
                        name:     plant.friendlyName,
                        emoji:    plant.emoji,
                        action:   'move-shade',
                        icon:     '🌙',
                        label:    'Too much light',
                        done:     (interaction.lastMoved || 0) > this.mountedAt,
                    });
                }
                return items;
            });
        },

        pendingTodoCount() {
            return this.todoItems.filter(i => !i.done).length;
        },

        selectedPlant() {
            if (!this.selectedPlantId) return null;
            return this.allPlants.find(p => p.entityId === this.selectedPlantId) || null;
        },

        roomStyle() {
            const room = (this.view === 'detail' && this.selectedPlant)
                ? (KNOWN_ROOMS[this.selectedPlant.areaId] || DEFAULT_ROOM)
                : DEFAULT_ROOM;
            return {
                '--room-wall':   room.wallColour,
                '--room-floor':  room.floorColour,
                '--room-accent': room.accentColour,
            };
        },
    },

    methods: {
        openPlant(entityId) {
            this.selectedPlantId = entityId;
            this.view = 'detail';
        },

        closePlant() {
            this.view = 'list';
            this.selectedPlantId = null;
        },

        plantStatusClass(entityId) {
            const state = this.plantStates[entityId]?.state;
            if (state === 'ok')      return 'status-ok';
            if (state === 'problem') return 'status-problem';
            return 'status-unknown';
        },

        // Wraps canPetPlant so the template tracks timeNow for cooldown re-evaluation
        isPettable(entityId) {
            this.timeNow; // reactive dependency — re-evaluated every 5 s
            return canPetPlant(entityId);
        },

        handlePet(entityId) {
            if (!this.isPettable(entityId)) return;
            petPlant(entityId);
        },

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

        showToast(text) {
            this.toastText = text;
            this.toastShown = true;
            clearTimeout(this._toastTimeout);
            this._toastTimeout = setTimeout(() => { this.toastShown = false; }, 2500);
        },
    },

    mounted() {
        if (this.isConfigured) connectToHA();
        this.mountedAt = Date.now();

        this._tick = setInterval(() => { this.timeNow = Date.now(); }, 5000);

        this._onWatered = ({ entityId, coins }) => {
            const name = this.plantStates[entityId]?.attributes?.friendly_name || entityId;
            this.showToast(`💧 ${name} watered! +${coins}`);
        };
        this._onMoved = ({ entityId, coins, inSun }) => {
            const name = this.plantStates[entityId]?.attributes?.friendly_name || entityId;
            this.showToast(`${inSun ? '☀️' : '🌙'} ${name} moved! +${coins}`);
        };
        events.addListener('plant-watered', this._onWatered);
        events.addListener('plant-moved',   this._onMoved);
    },

    unmounted() {
        disconnectFromHA();
        clearInterval(this._tick);
        clearTimeout(this._toastTimeout);
        events.removeListener('plant-watered', this._onWatered);
        events.removeListener('plant-moved',   this._onMoved);
    },

    template: /* html */`
    <div class="${styles}" :style="roomStyle">

        <!-- ══════════════ LIST VIEW ══════════════ -->
        <template v-if="view === 'list'">

            <div class="header">
                <button class="nav-btn" @click="router.goTo('EarnCoins')">←</button>
                <span class="page-title">🌿 Plants</span>
                <button class="nav-btn" @click="showTodo = true" :disabled="!isConfigured && allPlants.length === 0">
                    📋
                    <span v-if="pendingTodoCount > 0" class="todo-badge">{{ pendingTodoCount }}</span>
                </button>
            </div>

            <div v-if="isConfigured && !haAvailable" class="status-strip">
                {{ haError || 'Connecting to Home Assistant…' }}
                <br>Watering and move rewards need your home network
            </div>

            <div class="plants-scroll">

                <!-- HA setup prompt -->
                <div v-if="!isConfigured" class="ha-setup">
                    <p>Connect Home Assistant for live sensor data and automatic coin rewards</p>
                    <MinimalInput label="HA URL" v-model="haUrl" type="url" />
                    <MinimalInput label="Access token" v-model="haToken" type="password" />
                    <RetroButton class="ha-connect-btn" variant="info" @click="connectToHA()">Connect</RetroButton>
                </div>

                <!-- Waiting -->
                <p v-else-if="allPlants.length === 0" class="empty-state">
                    {{ haAvailable ? 'No plants found' : 'Connecting…' }}
                </p>

                <!-- Room sections -->
                <div v-for="room in plantsByRoom" :key="room.areaId || 'unknown'" class="room-section">
                    <div class="room-header">{{ room.name }}</div>
                    <div class="plant-grid">
                        <div
                            v-for="plant in room.plants"
                            :key="plant.entityId"
                            class="plant-card"
                            @click="openPlant(plant.entityId)"
                        >
                            <span class="card-emoji">{{ plant.emoji }}</span>
                            <span class="card-name">{{ plant.friendlyName }}</span>
                            <span class="card-status" :class="plantStatusClass(plant.entityId)"></span>
                        </div>
                    </div>
                </div>

            </div>
        </template>

        <!-- ══════════════ DETAIL VIEW ══════════════ -->
        <template v-else-if="view === 'detail' && selectedPlant">

            <div class="header">
                <button class="nav-btn" @click="closePlant()">←</button>
                <span class="page-title">{{ selectedPlant.friendlyName }}</span>
                <span class="header-emoji">{{ selectedPlant.emoji }}</span>
            </div>

            <div class="detail-scroll">

                <div class="detail-hero">
                    <span class="hero-emoji">{{ selectedPlant.emoji }}</span>
                </div>

                <!-- Sensor readings -->
                <div v-if="hasLiveData" class="sensor-section">
                    <div v-if="selectedPlant.moisture !== null" class="sensor-row">
                        <span class="sensor-icon">💧</span>
                        <span class="sensor-label">Moisture</span>
                        <span class="sensor-value" :style="{ color: sensorColour(selectedPlant.entityId, 'moisture') }">
                            {{ formatSensor(selectedPlant.moisture, 'moisture') }}
                        </span>
                    </div>
                    <div v-if="selectedPlant.temperature !== null" class="sensor-row">
                        <span class="sensor-icon">🌡</span>
                        <span class="sensor-label">Temperature</span>
                        <span class="sensor-value" :style="{ color: sensorColour(selectedPlant.entityId, 'temperature') }">
                            {{ formatSensor(selectedPlant.temperature, 'temperature') }}
                        </span>
                    </div>
                    <div v-if="selectedPlant.illuminance !== null" class="sensor-row">
                        <span class="sensor-icon">{{ sunAboveHorizon ? '☀️' : '🌙' }}</span>
                        <span class="sensor-label">Light</span>
                        <span class="sensor-value" :style="{ color: sensorColour(selectedPlant.entityId, 'illuminance') }">
                            {{ formatSensor(selectedPlant.illuminance, 'illuminance') }}
                        </span>
                    </div>
                    <div v-if="selectedPlant.conductivity !== null" class="sensor-row">
                        <span class="sensor-icon">🧪</span>
                        <span class="sensor-label">Conductivity</span>
                        <span class="sensor-value" :style="{ color: sensorColour(selectedPlant.entityId, 'conductivity') }">
                            {{ formatSensor(selectedPlant.conductivity, 'conductivity') }}
                        </span>
                    </div>
                    <p v-if="selectedPlant.moisture === null && selectedPlant.illuminance === null && selectedPlant.temperature === null" class="no-sensors">
                        No sensor data
                    </p>
                </div>
                <p v-else-if="isConfigured" class="no-sensors">Awaiting sensor data…</p>

                <div v-if="selectedPlant.hasMovedBefore" class="sun-row">
                    Currently {{ selectedPlant.inSun ? 'in sun 🌞' : 'in shade 🌙' }}
                </div>

                <div class="pet-section">
                    <RetroButton
                        class="pet-btn"
                        variant="warning"
                        :class="{ 'faux-disabled': !isPettable(selectedPlant.entityId) }"
                        @click="handlePet(selectedPlant.entityId)"
                    >🤚 Pet +2</RetroButton>
                </div>

            </div>
        </template>

        <!-- ══════════════ TODO OVERLAY ══════════════ -->
        <div v-if="showTodo" class="todo-overlay" @click.self="showTodo = false">
            <div class="todo-panel">

                <div class="todo-header">
                    <span class="todo-title">What needs doing?</span>
                    <button class="todo-close-btn" @click="showTodo = false">✕</button>
                </div>

                <div class="todo-body">
                    <p v-if="!isConfigured" class="todo-empty">
                        Connect to Home Assistant to see what your plants need
                    </p>
                    <p v-else-if="!hasLiveData" class="todo-empty">
                        Connecting to Home Assistant…
                    </p>
                    <p v-else-if="todoItems.length === 0" class="todo-empty">
                        All good! 🌱 Nothing to do right now.
                    </p>
                    <div
                        v-for="item in todoItems"
                        :key="item.entityId + item.action"
                        class="todo-item"
                        :class="{ 'todo-done': item.done }"
                        @click="openPlant(item.entityId); showTodo = false"
                    >
                        <span class="todo-plant-emoji">{{ item.emoji }}</span>
                        <div class="todo-info">
                            <span class="todo-plant-name">{{ item.name }}</span>
                            <span class="todo-action-label">{{ item.icon }} {{ item.label }}</span>
                        </div>
                        <span class="todo-check">{{ item.done ? '✓' : '' }}</span>
                    </div>
                </div>

            </div>
        </div>

        <!-- Coin reward toast -->
        <RetroToast class="toast" :show="toastShown" position="bottom">{{ toastText }}</RetroToast>

    </div>
    `,
}
