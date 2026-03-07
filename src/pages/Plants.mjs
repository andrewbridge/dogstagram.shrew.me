import { css } from 'goober';
import RetroButton from '../components/RetroButton.mjs';
import RetroToast from '../components/RetroToast.mjs';
import MinimalInput from '../components/MinimalInput.mjs';
import PlantCard from '../components/PlantCard.mjs';
import PlantDetail from '../components/PlantDetail.mjs';
import PlantTodoSheet from '../components/PlantTodoSheet.mjs';
import {
    haUrl, haToken, haConnected, haAvailable, haHistoryLoaded, haError,
    plantStates, plantAreaIds, haAreas, plantSensorValues, isRefreshing,
    isHaConfigured, connectToHA, disconnectFromHA, refreshRegistries,
} from '../services/homeAssistant.mjs';
import {
    cachedPlants, plantInteractions, assessLight,
} from '../services/plantData.mjs';
import { events } from '../services/data.mjs';
import { KNOWN_PLANTS, DEFAULT_PLANT } from '../constants/plants.mjs';
import { nameToHue } from '../utilities/colours.mjs';
import { DEFAULT_HUE } from '../constants/colours.mjs';
import ClipboardListCheck from '../components/icons/ClipboardListCheck.mjs';

const styles = css`
    @keyframes pan {
        0% { background-position: 0% 0%; }
        100% { background-position: 100% 100%; }
    }

    & {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: "Press Start 2P", cursive;
        background: hsl(calc(var(--plant-hue, ${DEFAULT_HUE}) * 1deg) 65.3% 80.8%);
        background: radial-gradient(circle,
            hsl(calc(var(--plant-hue, ${DEFAULT_HUE}) * 1deg) 65.3% 80.8%) 0%,
            hsl(calc((var(--plant-hue, ${DEFAULT_HUE}) + 12) * 1deg) 65.3% 80.8%) 100%);
        position: relative;
        overflow-y: auto;
    }

    &::before {
        content: "";
        background-image: url(./assets/plantedex-background.svg);
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        opacity: 0.1;
        background-size: 10%;
        image-rendering: pixelated;
        animation: pan 120s linear infinite;
    }

    & .header {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: space-around;
        padding: 1.5vh 2vh;
        min-height: 20vh;
        position: relative;
        z-index: 1;
    }

    & .nav-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 3vh;
        padding: 0 0.5vh;
        line-height: 1;
        position: relative;
    }

    & .todo-btn {
        position: absolute;
        height: 2em;
        width: 2em;
        right: 2vh;
        top: 1.5vh;
    }

    & .page-title {
        font-size: 1.25em;
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

    & .connection-status {
        display: flex;
        align-items: center;
        gap: 0.6em;
        font-size: 0.6em;
        color: rgba(0, 0, 0, 0.45);
    }

    & .status-dot {
        width: 0.8em;
        height: 0.8em;
        border-radius: 50%;
        border: .15em solid rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
        &.dot-connecting { background: #c09030; }
        &.dot-connected  { background: #60c060; }
        &.dot-error      { background: #e06060; }
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
        color: #1b1b1b;
        font-size: 1.125em;
        padding: 1vh 2vh;
    }

    & .plant-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5vh;
        padding: 1.5vh 2vh;
    }

    & .refresh-section {
        display: flex;
        justify-content: center;
        padding: 2vh 2vh 4vh;
        position: relative;
        z-index: 1;
    }

    & .refresh-btn { font-size: 1.2vh; }

    & .toast { font-size: 2.5vh; }
`;

export default {
    name: 'Plants',
    inject: ['router'],
    components: { ClipboardListCheck, RetroButton, RetroToast, MinimalInput, PlantCard, PlantDetail, PlantTodoSheet },
    data: () => ({
        // HA reactive refs (unwrapped via Options API data())
        haUrl, haToken, haConnected, haAvailable, haHistoryLoaded, haError,
        plantStates, plantAreaIds, haAreas, plantSensorValues, isRefreshing,
        // Plant data reactive refs
        cachedPlants, plantInteractions,
        // Local UI state
        view: 'list',          // 'list' | 'detail'
        selectedPlantId: null,
        showTodo: false,
        mountedAt: 0,
        toastText: '',
        toastShown: false,
    }),

    computed: {
        isConfigured() { return isHaConfigured(); },

        hasLiveData() {
            return Object.keys(this.plantStates).length > 0;
        },

        connectionStatus() {
            if (!this.isConfigured) return null;
            if (this.isRefreshing)
                return { text: 'Refreshing…', dot: 'dot-connecting' };
            if (this.haError || (!this.haConnected && this.haAvailable))
                return { text: 'Disconnected', dot: 'dot-error' };
            if (!this.haConnected)
                return { text: 'Connecting…', dot: 'dot-connecting' };
            if (!this.haHistoryLoaded)
                return { text: 'Loading…', dot: 'dot-connecting' };
            if (this.haAvailable)
                return { text: 'Connected', dot: 'dot-connected' };
            return null;
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

        // Plants grouped by room
        plantsByRoom() {
            const groups = new Map();
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
            return [...groups.values()].filter(g => g.plants.length > 0);
        },

        // To-do items: plants whose HA status indicates they need attention
        todoItems() {
            if (!this.hasLiveData) return [];
            return this.allPlants.flatMap(plant => {
                const attrs       = this.plantStates[plant.entityId]?.attributes || {};
                const interaction = this.plantInteractions[plant.entityId] || {};
                const items       = [];

                const moistureStatus = attrs.moisture_status?.toLowerCase();
                const lightResult    = assessLight(plant.entityId);

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
                if (lightResult === 'needs-more-light') {
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
                if (lightResult === 'needs-more-shade') {
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

        pageStyle() {
            const hue = (this.view === 'detail' && this.selectedPlant)
                ? nameToHue(this.selectedPlant.friendlyName)
                : DEFAULT_HUE;
            return { '--plant-hue': hue };
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
        clearTimeout(this._toastTimeout);
        events.removeListener('plant-watered', this._onWatered);
        events.removeListener('plant-moved',   this._onMoved);
    },

    template: /* html */`
    <div class="${styles}" :style="pageStyle">

        <!-- ══════════════ LIST VIEW ══════════════ -->
        <template v-if="view === 'list'">

            <div class="header">
                <button class="nav-btn" @click="router.goTo('EarnCoins')">←</button>
                <span class="page-title">Plantédex</span>
                <span v-if="connectionStatus" class="connection-status">
                    <span class="status-dot" :class="connectionStatus.dot"></span>
                    {{ connectionStatus.text }}
                </span>
                <button v-if="pendingTodoCount > 0" class="nav-btn todo-btn" @click="showTodo = true">
                    <ClipboardListCheck />
                    <span class="todo-badge">{{ pendingTodoCount }}</span>
                </button>
            </div>

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
            <template v-else>
                <div v-for="room in plantsByRoom" :key="room.areaId || 'unknown'" class="room-section">
                    <div class="room-header">{{ room.name }}</div>
                    <div class="plant-grid">
                        <PlantCard
                            v-for="plant in room.plants"
                            :key="plant.entityId"
                            :emoji="plant.emoji"
                            :name="plant.friendlyName"
                            :status-class="plantStatusClass(plant.entityId)"
                            @click="openPlant(plant.entityId)"
                        />
                    </div>
                </div>
                <div class="refresh-section">
                    <RetroButton
                        class="refresh-btn"
                        variant="info"
                        :class="{ 'faux-disabled': isRefreshing }"
                        @click="refreshRegistries()"
                    >Refresh plant data</RetroButton>
                </div>
            </template>
        </template>

        <!-- ══════════════ DETAIL VIEW ══════════════ -->
        <template v-else-if="view === 'detail' && selectedPlant">

            <div class="header">
                <button class="nav-btn" @click="closePlant()">←</button>
                <span class="page-title">{{ selectedPlant.friendlyName }}</span>
                <span class="header-emoji">{{ selectedPlant.emoji }}</span>
            </div>

            <PlantDetail :plant="selectedPlant" />
        </template>

        <!-- ══════════════ TODO OVERLAY ══════════════ -->
        <PlantTodoSheet
            :show="showTodo"
            :items="todoItems"
            :is-configured="isConfigured"
            :has-live-data="hasLiveData"
            @close="showTodo = false"
            @select-plant="openPlant($event); showTodo = false"
        />

        <!-- Coin reward toast -->
        <RetroToast class="toast" :show="toastShown" position="bottom">{{ toastText }}</RetroToast>

    </div>
    `,
}
