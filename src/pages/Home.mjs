import { css } from 'goober';
import DogSprite from '../components/DogSprite.mjs';
import RetroButton from '../components/RetroButton.mjs';
import RetroToast from '../components/RetroToast.mjs';
import Dogagotchi from '../components/Dogagotchi.mjs';
import RetroProgress from '../components/RetroProgress.mjs';
import {
    dogVariant,
    dogHappiness,
    canPet,
    petDog,
    dogHunger,
    canFeed,
    feedDog,
    accountBalance,
    dogName
} from '../services/data.mjs';

const styles = css`
    & {
        display: flex;
        flex-direction: column;
        position: relative;
        height: 100%;
        font-family: "Press Start 2P", cursive;
        background: #ae4f36;
    }

    & .top-display {
        position: absolute;
        top: 2vh;
        left: 2vh;
        width: calc(100% - 4vh);
        z-index: 1;
        display: flex;
        align-items: center;
        font-size: 3vh;
        & img {
            width: 4vh;
            height: 4vh;
            margin-right: 1vh;
        }

        & .name {
            margin-left: auto;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding-left: 2vh;
        }
    }

    & .room {
        height: 35vh;
        background: #e8e7c6;
        border-bottom: 0.6vh solid black;
        position: relative;
        display: flex;
        align-items: end;

        &::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 25vh;
            background: url(./assets/furniture.png) no-repeat bottom center;
            background-size: contain;
        }
    }

    & .faux-disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    & .hud {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
    }

    & .actions {
        display: flex;
        gap: 2vh;
        justify-content: center;
        font-size: 2vh;
    }

    & .meters {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2vh;
        color: white;
        font-size: 3vh;

        & label {
            margin-top: 3vh;
        }
    }

    & .earn-button {
        margin: 0 8.5vh;
        font-size: 2vh;
    }

    & .toast {
        font-size: 3vh;
    }
`;

const dogAdjustment = css`
    & {
        transform: translateY(6.5vh);
    }
`;

export default {
	name: 'Home',
    inject: ['router'],
    components: { Dogagotchi, RetroButton, RetroToast, RetroProgress },
	data: () => ({ dogName, accountBalance, dogVariant, canPet, dogHappiness, canFeed, dogHunger, noCashToastShown: false, noCashToastUid: null }),
    computed: {
        happinessColour() {
            if (this.dogHappiness > 75) return 'success';
            if (this.dogHappiness < 25) return 'danger';
            return 'warning';
        },
        hungerColour() {
            if (this.dogHunger > 75) return 'danger';
            if (this.dogHunger < 25) return 'success';
            return 'warning';
        },
        accountBalanceDisplay() {
            return String(this.accountBalance).padStart(3, '0');
        }
    },
	methods: {
		warnNoCash() {
			this.noCashToastShown = true;
			clearTimeout(this.noCashToastUid);
			this.noCashToastUid = setTimeout(() => this.noCashToastShown = false, 1500);
		},
		attemptFeed() {
			if (!this.canFeed) {
				return this.warnNoCash();
			}
			return feedDog();
		},
		attemptPet() {
			if (!this.canPet) {
				return this.warnNoCash();
			}
			return petDog();
		},
	},
	template: /* html */`
    <div class="${styles}">
        <div class="top-display">
            <img src="./assets/coin.png" />
            <p>{{ accountBalanceDisplay }}</p>
            <p class="name" @click="router.goTo('Setup')">{{dogName}}</p>
        </div>
        <div class="room">
            <Dogagotchi class="${dogAdjustment}" />
        </div>
        <div class="hud">
            <div class="meters">
                <label for="happiness">Happiness</label>
                <RetroProgress name="happiness" :value="dogHappiness" :variant="happinessColour" max="100" />
                <label for="hunger">Hunger</label>
                <RetroProgress name="hunger" :value="dogHunger" :variant="hungerColour" max="100" />
            </div>
            <div class="actions">
                <RetroButton variant="info" @click="attemptFeed" :class="{ 'faux-disabled': !canFeed }">Feed</RetroButton>
                <RetroButton variant="warning" @click="attemptPet" :class="{ 'faux-disabled': !canPet }">Pet</RetroButton>
            </div>
            <RetroButton class="earn-button" variant="success" @click="router.goTo('Feed')">Earn Coins</RetroButton>
        </div>
        <RetroToast class="toast" :show="noCashToastShown" position="bottom">Not enough coins!</RetroToast>
    </div>
	`
}