import { css } from 'goober';

const styles = css`
    & {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        z-index: 10;
        font-family: "Press Start 2P", cursive;
    }

    & .todo-panel {
        background: #d0ccc8;
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

    & .todo-plant-emoji { height: 5vh; image-rendering: pixelated; flex-shrink: 0; }

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
`;

export default {
    name: 'PlantTodoSheet',
    props: {
        show:         { type: Boolean, required: true },
        items:        { type: Array, default: () => [] },
        isConfigured: { type: Boolean, default: false },
        hasLiveData:  { type: Boolean, default: false },
    },
    emits: ['close', 'select-plant'],
    template: /* html */`
    <div v-if="show" class="${styles}" @click.self="$emit('close')">
        <div class="todo-panel">

            <div class="todo-header">
                <span class="todo-title">What needs doing?</span>
                <button class="todo-close-btn" @click="$emit('close')">✕</button>
            </div>

            <div class="todo-body">
                <p v-if="!isConfigured" class="todo-empty">
                    Connect to Home Assistant to see what your plants need
                </p>
                <p v-else-if="!hasLiveData" class="todo-empty">
                    Connecting to Home Assistant…
                </p>
                <p v-else-if="items.length === 0" class="todo-empty">
                    All good! 🌱 Nothing to do right now.
                </p>
                <div
                    v-for="item in items"
                    :key="item.entityId + item.action"
                    class="todo-item"
                    :class="{ 'todo-done': item.done }"
                    @click="$emit('select-plant', item.entityId)"
                >
                    <img class="todo-plant-emoji" :src="item.image" :alt="item.name" />
                    <div class="todo-info">
                        <span class="todo-plant-name">{{ item.name }}</span>
                        <span class="todo-action-label">{{ item.icon }} {{ item.label }}</span>
                    </div>
                    <span class="todo-check">{{ item.done ? '✓' : '' }}</span>
                </div>
            </div>

        </div>
    </div>
    `,
}
