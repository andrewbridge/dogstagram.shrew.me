import { css } from 'goober';

const CARD_HUES = [
    13,   // red
    64,  // yellow
    115,   // green
    166,  // cyan
    217,  // blue
    268,  // purple
    319,   // magenta
];

function nameToColour(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    const hue = CARD_HUES[((h % CARD_HUES.length) + CARD_HUES.length) % CARD_HUES.length];
    return `hsl(${hue}deg 59% 55.1%)`;
}

const styles = css`
    & {
        position: relative;
        border: .4vh solid rgba(0, 0, 0, 0.25);
        border-radius: 0.7em;
        padding: 2vh 1vh 1.5vh;
        display: flex;
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
        font-family: "Press Start 2P", cursive;
    }

    & .card-status {
        position: absolute;
        top: -.7vh;
        right: -.7vh;
        width: 1.4vh;
        height: 1.4vh;
        border-radius: 50%;
        border: .2vh solid rgba(0, 0, 0, 0.3);
        &.status-ok      { background: #60c060; }
        &.status-problem { background: #e06060; }
        &.status-unknown { background: #909090; }
    }
`;

export default {
    name: 'PlantCard',
    props: {
        emoji:       { type: String, required: true },
        name:        { type: String, required: true },
        statusClass: { type: String, default: 'status-unknown' },
    },
    emits: ['click'],
    computed: {
        cardStyle() { return { background: nameToColour(this.name) }; },
    },
    template: /* html */`
    <div class="${styles}" :style="cardStyle" @click="$emit('click')">
        <span class="card-name">{{ name }}</span>
        <span class="card-emoji">{{ emoji }}</span>
        <span class="card-status" :class="statusClass"></span>
    </div>
    `,
}
