import { css } from 'goober';
import RetroButton from '../components/RetroButton.mjs';
import { accountBalance } from '../services/data.mjs';

const styles = css`
    & {
        display: flex;
        flex-direction: column;
        height: 100%;
        font-family: "Press Start 2P", cursive;
        background: #ae4f36;
        align-items: center;
        justify-content: center;
        gap: 4vh;
        padding: 4vh;
    }

    & .balance {
        display: flex;
        align-items: center;
        font-size: 3vh;
        color: white;
        gap: 1vh;
        & img { width: 4vh; height: 4vh; }
    }

    & .prompt {
        color: white;
        font-size: 2vh;
        text-align: center;
        line-height: 2;
    }

    & .choices {
        display: flex;
        flex-direction: column;
        gap: 3vh;
        align-items: center;
        width: 100%;
    }

    & .choice-btn {
        width: 30vh;
        font-size: 2vh;
    }

    & .back-btn {
        font-size: 1.5vh;
        margin-top: 2vh;
    }
`;

export default {
    name: 'EarnCoins',
    inject: ['router'],
    components: { RetroButton },
    data: () => ({ accountBalance }),
    computed: {
        balanceDisplay() {
            return String(this.accountBalance).padStart(3, '0');
        },
    },
    template: /* html */`
    <div class="${styles}">
        <div class="balance">
            <img src="./assets/coin.png" />
            <p>{{ balanceDisplay }}</p>
        </div>
        <p class="prompt">How do you want to earn coins?</p>
        <div class="choices">
            <RetroButton class="choice-btn" variant="info" @click="router.goTo('Feed')">See Dogs</RetroButton>
            <RetroButton class="choice-btn" variant="success" @click="router.goTo('Plants')">PLANTS!</RetroButton>
        </div>
        <RetroButton class="back-btn" variant="danger" @click="router.goTo('Home')">← Back</RetroButton>
    </div>
    `,
}
