import { css } from 'goober';
import { haToken, connectToHA } from '../services/homeAssistant.mjs';
import MinimalInput from './MinimalInput.mjs';
import RetroButton from './RetroButton.mjs';

const styles = css`
    & {
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
        z-index: 1;
    }
`;

export default {
    name: 'HASetupForm',
    components: { MinimalInput, RetroButton },
    data: () => ({
        tokenInput: '',
    }),
    methods: {
        submit() {
            if (!this.tokenInput.trim()) return;
            haToken.value = this.tokenInput.trim();
            connectToHA();
        },
    },
    template: /* html */`
    <div class="${styles}">
        <p>Connect Home Assistant for live sensor data and automatic coin rewards</p>
        <MinimalInput label="Access token" v-model="tokenInput" type="password" />
        <RetroButton variant="info" @click="submit()">Connect</RetroButton>
    </div>
    `,
};
