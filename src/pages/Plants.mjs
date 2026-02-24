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
    }

    & .room-label {
        font-size: 1.8vh;
        text-align: center;
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

    & .plants-list {
        flex-grow: 1;
        overflow-y: auto;
        padding: 2vh;
        display: flex;
        flex-direction: column;
        gap: 2vh;
    }

    & .ha-setup {
        background: rgba(0, 0, 0, 0.45);
        border: .4vh solid rgba(0, 0, 0, 0.5);
        padding: 2vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5vh;
        color: white;
        font-size: 1.4vh;
        text-align: center;
        line-height: 2;
    }

    & .ha-connect-btn {
        font-size: 1.4vh;
    }

    & .plant-card {
        background: rgba(0, 0, 0, 0.2);
        border: .4vh solid rgba(0, 0, 0, 0.3);
        padding: 2vh;
        display: flex;
        flex-direction: column;
        gap: 1.5vh;
    }

    & .plant-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    & .plant-name {
        display: flex;
        align-items: center;
        gap: 1vh;
        font-size: 2.2vh;
        color: white;
    }

    & .sun-indicator {
        font-size: 2.2vh;
    }

    & .sensors {
        display: flex;
        flex-direction: column;
        gap: 1vh;
    }

    & .sensor-row {
        display: flex;
        align-items: center;
        gap: 1.5vh;
        font-size: 1.7vh;
    }

    & .sensor-icon { width: 2.5vh; text-align: center; }

    & .sensor-night {
        color: rgba(255, 255, 255, 0.4);
        font-size: 1.2vh;
    }

    & .no-sensors {
        color: rgba(255, 255, 255, 0.35);
        font-size: 1.3vh;
    }

    & .pet-row {
        display: flex;
        justify-content: flex-end;
    }

    & .pet-btn {
        font-size: 1.5vh;
    }

    & .faux-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    & .empty-room {
        color: rgba(0, 0, 0, 0.4);
        font-size: 1.6vh;
        text-align: center;
        padding: 4vh 2vh;
    }

    & .room-picker-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2vh;
        z-index: 10;
        padding: 4vh;
    }

    & .room-picker-title {
        color: white;
        font-size: 1.8vh;
    }

    & .room-btn {
        width: 100%;
        max-width: 40vh;
        font-size: 1.8vh;
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
        activeRoomKey: null,
        showRoomPicker: false,
        toastText: '',
        toastShown: false,
        // Tick ref to trigger cooldown re-evaluation every 5 s
        timeNow: Date.now(),
    }),

    computed: {
        isConfigured() { return isHaConfigured(); },

        // Whether live HA plant data is available
        hasLiveData() {
            console.log(this.plantStates);
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
                    moisture:         sensors.moisture     ?? null,
                    temperature:      sensors.temperature  ?? null,
                    illuminance:      sensors.illuminance  ?? null,
                    conductivity:     sensors.conductivity ?? null,
                    inSun:            interaction?.inSun ?? false,
                    hasMovedBefore:   interaction ? interaction.lastMoved > 0 : false,
                };
            });
        },

        // Rooms that have at least one plant: KNOWN_ROOMS entries first (in definition
        // order), then any HA areas not in KNOWN_ROOMS
        occupiedRooms() {
            const areaIds = new Set(this.allPlants.map(p => p.areaId).filter(Boolean));
            const known   = Object.keys(KNOWN_ROOMS).filter(id => areaIds.has(id));
            const unknown = [...areaIds].filter(id => !KNOWN_ROOMS[id]);
            return [...known, ...unknown].map(areaId => ({
                areaId,
                name: this.haAreas[areaId]?.name || areaId,
            }));
        },

        activeRoom() {
            return KNOWN_ROOMS[this.activeRoomKey] || DEFAULT_ROOM;
        },

        activeRoomName() {
            if (!this.activeRoomKey) return 'Plants';
            return this.haAreas[this.activeRoomKey]?.name || this.activeRoomKey;
        },

        // CSS custom properties to drive the room background colour
        roomStyle() {
            const room = this.activeRoom;
            return {
                '--room-wall':   room.wallColour,
                '--room-floor':  room.floorColour,
                '--room-accent': room.accentColour,
            };
        },

        plantsInRoom() {
            if (!this.activeRoomKey) return this.allPlants;
            return this.allPlants.filter(p => p.areaId === this.activeRoomKey);
        },
    },

    watch: {
        // When plants load (HA connects), pick the first occupied room if current
        // selection is no longer valid
        occupiedRooms(rooms) {
            if (rooms.length > 0 && !rooms.find(r => r.areaId === this.activeRoomKey)) {
                this.activeRoomKey = rooms[0].areaId;
            }
        },
    },

    methods: {
        // Wraps canPetPlant so the template tracks timeNow for cooldown re-evaluation
        isPettable(entityId) {
            this.timeNow; // reactive dependency — re-evaluated every 5 s
            return canPetPlant(entityId);
        },

        handlePet(entityId) {
            if (!this.isPettable(entityId)) return;
            petPlant(entityId);
        },

        // Returns a CSS colour string for a sensor reading.
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

        selectRoom(key) {
            this.activeRoomKey = key;
            this.showRoomPicker = false;
        },
    },

    mounted() {
        // Auto-connect to HA if credentials are already saved
        if (this.isConfigured) connectToHA();

        // Set initial room
        if (this.occupiedRooms.length > 0) {
            this.activeRoomKey = this.occupiedRooms[0].areaId;
        }

        // Tick every 5 s to refresh pet-button cooldown state
        this._tick = setInterval(() => { this.timeNow = Date.now(); }, 5000);

        // Listen for automated coin rewards from plantData.mjs
        this._onWatered = ({ entityId, coins }) => {
            const name = this.plantStates[entityId]?.attributes?.friendly_name
                      || entityId;
            this.showToast(`💧 ${name} watered! +${coins}`);
        };
        this._onMoved = ({ entityId, coins, inSun }) => {
            const name = this.plantStates[entityId]?.attributes?.friendly_name
                      || entityId;
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

        <!-- Room picker overlay -->
        <div v-if="showRoomPicker" class="room-picker-overlay">
            <p class="room-picker-title">Pick a room</p>
            <RetroButton
                v-for="room in occupiedRooms"
                :key="room.areaId"
                class="room-btn"
                :variant="room.areaId === activeRoomKey ? 'success' : 'info'"
                @click="selectRoom(room.areaId)"
            >{{ room.name }}</RetroButton>
            <RetroButton class="room-btn" variant="danger" @click="showRoomPicker = false">Close</RetroButton>
        </div>

        <!-- Header -->
        <div class="header">
            <button class="nav-btn" @click="router.goTo('EarnCoins')">←</button>
            <span class="room-label">🌿 {{ activeRoomName }}</span>
            <button class="nav-btn" @click="showRoomPicker = true" :disabled="occupiedRooms.length < 2">🗺</button>
        </div>

        <!-- Offline / error strip -->
        <div v-if="isConfigured && !haAvailable" class="status-strip">
            {{ haError || 'Connecting to Home Assistant…' }}
            <br>Watering and move rewards need your home network
        </div>

        <!-- Plant list -->
        <div class="plants-list">

            <!-- HA setup prompt -->
            <div v-if="!isConfigured" class="ha-setup">
                <p>Connect Home Assistant for live sensor data and automatic coin rewards</p>
                <div class="ha-setup-form">
                    <MinimalInput label="HA URL" v-model="haUrl" type="url" />
                    <MinimalInput label="Access token" v-model="haToken" type="password" />
                </div>
                <RetroButton class="ha-connect-btn" variant="info" @click="connectToHA()">Connect</RetroButton>
            </div>

            <!-- Empty state -->
            <p v-if="plantsInRoom.length === 0 && (hasLiveData || cachedPlants.length > 0)" class="empty-room">
                No plants in {{ activeRoomName }}
            </p>
            <p v-else-if="plantsInRoom.length === 0 && !isConfigured" class="empty-room">
                Connect to Home Assistant to see your plants
            </p>

            <!-- Plant cards -->
            <div v-for="plant in plantsInRoom" :key="plant.entityId" class="plant-card">

                <!-- Name + sun indicator -->
                <div class="plant-head">
                    <div class="plant-name">
                        <span>{{ plant.emoji }}</span>
                        <span>{{ plant.friendlyName }}</span>
                    </div>
                    <span v-if="plant.hasMovedBefore" class="sun-indicator">
                        {{ plant.inSun ? '🌞' : '🌙' }}
                    </span>
                </div>

                <!-- Sensor readings (only when live HA data is available) -->
                <div v-if="hasLiveData" class="sensors">
                    <div v-if="plant.moisture !== null" class="sensor-row">
                        <span class="sensor-icon">💧</span>
                        <span :style="{ color: sensorColour(plant.entityId, 'moisture') }">
                            {{ formatSensor(plant.moisture, 'moisture') }}
                        </span>
                    </div>
                    <div v-if="plant.illuminance !== null" class="sensor-row">
                        <span class="sensor-icon">{{ sunAboveHorizon ? '☀️' : '🌙' }}</span>
                        <span :style="{ color: sensorColour(plant.entityId, 'illuminance') }">
                            {{ formatSensor(plant.illuminance, 'illuminance') }}
                        </span>
                        <span v-if="!sunAboveHorizon" class="sensor-night">night</span>
                    </div>
                    <div v-if="plant.temperature !== null" class="sensor-row">
                        <span class="sensor-icon">🌡</span>
                        <span :style="{ color: sensorColour(plant.entityId, 'temperature') }">
                            {{ formatSensor(plant.temperature, 'temperature') }}
                        </span>
                    </div>
                    <div v-if="plant.conductivity !== null" class="sensor-row">
                        <span class="sensor-icon">🧪</span>
                        <span :style="{ color: sensorColour(plant.entityId, 'conductivity') }">
                            {{ formatSensor(plant.conductivity, 'conductivity') }}
                        </span>
                    </div>
                </div>
                <p v-else-if="isConfigured" class="no-sensors">Awaiting sensor data…</p>

                <!-- Pet button -->
                <div class="pet-row">
                    <RetroButton
                        class="pet-btn"
                        variant="warning"
                        :class="{ 'faux-disabled': !isPettable(plant.entityId) }"
                        @click="handlePet(plant.entityId)"
                    >🤚 +2</RetroButton>
                </div>
            </div>
        </div>

        <!-- Coin reward toast -->
        <RetroToast class="toast" :show="toastShown" position="bottom">{{ toastText }}</RetroToast>
    </div>
    `,
}
