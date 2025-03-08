import { css, keyframes } from "goober";
import { Howl } from "howler";
import DogSprite from "./DogSprite.mjs";
import { dogHappiness, dogHunger, dogVariant, events } from "../services/data.mjs";
import { wait, waitForEvent } from "../utilities/async.mjs";
import { clamp } from "../utilities/number.mjs";

const floatAnimation = keyframes`
    0% {
        margin-top: 0;
    }

    50% {
        margin-top: -1vh;
    }

    100% {
        margin-top: 0;
    }
`;

const styles = css`
    & {
        width: calc(100% - 10vh);
        margin-left: 5vh;
    }

    & .dog, & .item {
        transform: translateX(0);
        transition: transform 2.5s linear;
        margin-left: -10vh;
    }

    & .dog.walking, & .dog.crouched {
        transition-duration: 2s;
    }

    & .dog.running {
        transition-duration: 1s;
    }

    & .dog.sniffing {
        transition-duration: 1.5s;
    }

    &.fast .dog.walking, &.fast .dog.crouched {
        transition-duration: 1s;
    }

    &.fast .dog.running {
        transition-duration: .5s;
    }

    &.fast .dog.sniffing {
        transition-duration: .75s;
    }

    & .dog.jumping {
        transition-duration: .125s;
        transition-timing-function: ease-in;
    }

    & .item {
        position: absolute;
        left: 0;
        top: 0;
        image-rendering: pixelated;
        width: 20vh;
        background: no-repeat center;
        background-size: contain;
    }

    & .item.heart {
        background-image: url('./assets/heart.png');
        height: 4vh;
        animation: ${floatAnimation} 1s infinite;

        &.v-enter-active {
            transition: opacity .5s ease;
        }

        &.v-enter-from {
            opacity: 0;
        }

        &.v-leave-active {
            transition: top 10s ease;
        }

        &.v-leave-to {
            top: -50vh;
        }
    }

    & .item.food {
        background-image: url('./assets/meat.png');
        height: 4vh;
        margin-top: 10vh;

        &.v-leave-active {
            transition: opacity 3s ease;
        }

        &.v-leave-to {
            opacity: 0;
        }
    }
`;

const sounds = new Howl({
    src: ['./assets/dog-sounds.mp3'],
    sprite: {
        'eat-1': [0, 95],
        'eat-2': [100, 75],
        'eat-3': [200, 75],
        'bark-1': [300, 150],
        'bark-2': [500, 90]
    }
});

const eat = async () => {
    sounds.play('eat-1');
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
        const waitTime = Math.floor(Math.random() * 100) + 250;
        await wait(waitTime);
        sounds.play('eat-3')
    }
}

const eating = async () => {
    await eat();
    await wait(1000);
    await eat();
    await wait(500);
    await eat();
}

const singleBark = () => {
    const variant = Math.floor(Math.random() * 2) + 1;
    const sound = `bark-${variant}`;
    sounds.play(sound);
}

const bark = async () => {
    singleBark();
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
        const waitTime = Math.floor(Math.random() * 450) + 300;
        await wait(waitTime);
        singleBark();
    }
};

const excitedBark = async () => {
    await bark();
    await wait(1000);
    await bark();
};

export default {
    name: 'Dogagotchi',
    components: { DogSprite },
    data: () => ({
        dogHappiness,
        dogHunger,
        dogVariant,
        state: 'walking',
        direction: 'right',
        speed: 'slow',
        xPos: 0,
        item: null,
        wrapperWidth: 100,
        wrapperWidthTracker: null,
        feedHandler: null,
        petHandler: null,
        animating: false,
        lastActionEnd: 0,
        abortTriggerController: new AbortController(),
        abortCompletedTrigger: null,
        interactionInProgress: false,
    }),
    computed: {
        xPosPx() {
            const decimalXPos = this.xPos / 100;
            return `${decimalXPos * this.wrapperWidth}px`;
        },
        itemPosPx() {
            if (this.item === 'heart') return this.xPosPx;
            return `calc(${0.5 * this.wrapperWidth}px * 1.15)`;
        },
        abortTriggeredPromise() {
            return new Promise((resolve, reject) => {
                this.abortTriggerController.signal.addEventListener("abort", () => resolve());
            });
        }
    },
    async mounted() {
        this.wrapperWidthTracker = () => {
            this.wrapperWidth = this.$refs.wrapper.clientWidth;
        };
        this.wrapperWidthTracker();
        window.addEventListener("resize", this.wrapperWidthTracker);
        this.feedHandler = () => this.handleFeeding();
        this.petHandler = () => this.handleAffection();
        events.addListener('dog-fed', this.feedHandler);
        events.addListener('dog-pet', this.petHandler);
        this.animating = true;
        await this.move(50);
        this.state = 'sitting';
        this.lastActionEnd = Date.now();
        wait(2500).then(this.feedHandler);
        this.act();
    },
    unmounted() {
        window.removeEventListener("resize", this.wrapperWidthTracker);
        events.removeListener('dog-fed', this.feedHandler);
        events.removeListener('dog-pet', this.petHandler);
    },
    methods: {
        checkAborted() {
            if (this.abortTriggerController.signal.aborted === true) {
                if (typeof this.abortCompletedTrigger === "function") {
                    this.abortCompletedTrigger();
                }
                return true;
            }
            return false;
        },
        async act() {
            if (this.$refs.dog === null || this.checkAborted() || this.interactionInProgress) return;
            const timeSinceLastAction = Date.now() - this.lastActionEnd;
            if (timeSinceLastAction > 7000) {
                // Dramatically increase the chance of the idling for longer when lying down
                const actionCount = 5;
                const chance = this.state === "lying" ? actionCount * 2 : actionCount;
                const actionChoice = Math.floor(Math.random() * chance);
                let didSomething = true;
                switch (actionChoice) {
                    case 0:
                        this.state = "crouched";
                        await this.moveAtRandom();
                        break;
                    case 1:
                        this.state = "running";
                        await this.moveAtRandom();
                        break;
                    case 2:
                        this.state = "sniffing";
                        await this.moveAtRandom();
                        break;
                    case 3:
                        this.state = "walking";
                        await this.moveAtRandom();
                        break;
                    default:
                        // Don't do anything
                        didSomething = false;
                        break;
                }
                if (this.checkAborted()) return;
                if (didSomething) {
                    const idleChoice = Math.floor(Math.random() * 3);
                    this.state = idleChoice === 0 ? "lying" : "sitting";
                }
                this.lastActionEnd = Date.now();
                return this.act();
            }
            window.requestAnimationFrame(() => this.act());
        },
        async move(newPosition) {
            if (newPosition === this.xPos) return false;
            this.direction = newPosition > this.xPos ? "right" : "left";
            this.speed = Math.abs(newPosition - this.xPos) < 15 ? "fast" : "slow";
            this.xPos = newPosition;
            return Promise.race([
                waitForEvent(this.$refs.dog.$el, "transitionend"), // Normal behaviour, wait for dog to get to new position
                wait(3000), // Fail safe in case transitionend doesn't happen (if the browser is blurred?)
                this.abortTriggeredPromise, // If the user takes an action and we need to abort mid-walk
            ]);
        },
        moveAtRandom() {
            let newPosition = clamp(0, Math.floor(Math.random() * 50), 100);
            // Avoid walking to very close by positions as it animates weirdly
            const posDiff = newPosition - this.xPos;
            if (Math.abs(posDiff) < 5) {
                newPosition += Math.sign(posDiff) * 5;
            }
            return this.move(newPosition);
        },
        async abort() {
            const completedPromise = new Promise((resolve, reject) => {
                this.abortCompletedTrigger = resolve;
            });
            this.abortTriggerController.abort();
            await completedPromise;
            this.abortTriggerController = new AbortController();
        },
        async handleFeeding() {
            if (this.interactionInProgress) return;
            await this.abort();
            this.interactionInProgress = true;
            this.item = "food";
            this.state = "walking";
            await this.move(50);
            this.item = null;
            this.state = "eating";
            await eating();
            this.state = "sitting";
            this.interactionInProgress = false;
            this.act();
        },
        async handleAffection() {
            if (this.interactionInProgress) return;
            await this.abort();
            this.interactionInProgress = true;
            this.item = "heart";
            this.state = "jumping";
            this.xPos += this.direction === "left" ? -2 : 2;
            let barking = true;
            excitedBark().then(() => barking = false);
            await wait(500);
            while (barking) {
                this.direction = this.direction === "left" ? "right" : "left";
                this.xPos += this.direction === "left" ? -4 : 4;
                await wait(500);
            }
            this.item = null;
            this.state = "walking";
            this.animating = false;
            await wait(500);
            this.state = "sitting";
            this.animating = true;
            this.interactionInProgress = false;
            this.act();
        }
    },
    template: /* html */`
        <div ref="wrapper" class="${styles}" :class="{ [speed]: true }">
            <Transition>
                <div v-if="item" class="item" :class="item" :style="{ transform: 'translateX(' + itemPosPx + ')' }"></div>
            </Transition>
            <DogSprite ref="dog" class="dog" :animating="animating" :variant="dogVariant" :state="state" :direction="direction" :style="{ transform: 'translateX(' + xPosPx + ')' }"  />
        </div>
    `,
}