import { css, keyframes } from "goober";
import DogSprite from "../components/DogSprite.mjs";
import { dogName, dogVariant } from "../services/data.mjs";
import RetroButton from "../components/RetroButton.mjs";
import MinimalInput from "../components/MinimalInput.mjs";
import { DOG_VARIANTS } from "../constants.mjs";

const panAnimation = keyframes`
    0% {
        background-position: 0 0;
    }
    100% {
        background-position: 100% 100%;
    }
`;

const styles = css`
    & {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: "Press Start 2P", cursive;
        padding: 1rem;
        --dogs: 5;
    }

    & {
        background: radial-gradient(circle, rgb(238, 174, 225) 0%, rgb(238, 174, 223) 100%);
    }

    &::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        opacity: 0.1;
        background-image: url(./assets/instructions-background.svg);
        background-size: 10%;
        image-rendering: pixelated;
        animation: ${panAnimation} 120s linear infinite;
    }

    & .input {
        z-index: 1;
    }

    & .dog-select-wrapper {
        align-self: start;
        width: 100%;
        position: relative;
    }

    & .previous-dog, & .next-dog {
        background-color: transparent;
        border: none;
        cursor: pointer;
        font-size: 2rem;
        padding: 1rem;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
    }

    & .previous-dog {
        left: 0;
        z-index: 1;
    }

    & .next-dog {
        right: 0;
    }

    & .dog-select {
        display: flex;
        overflow: hidden;
        position: relative;
        width: calc(var(--dogs) * 100%);
        transition: 0.25s transform ease-in-out;
    }

    & .dog-wrapper {
        display: flex;
        justify-content: center;
        padding: 1rem;
        width: 100%;
    }

    & .dog-select > div {
        padding: 2.5rem;
        width: calc(100% / var(--dogs));
    }

    & .dog-select.dog-1 {
        transform: translateX(0%);
    }

    & .dog-select.dog-2 {
        transform: translateX(calc((-100% / var(--dogs)) * 1));
    }

    & .dog-select.dog-3 {
        transform: translateX(calc((-100% / var(--dogs)) * 2));
    }

    & .dog-select.dog-4 {
        transform: translateX(calc((-100% / var(--dogs)) * 3));
    }

    & .dog-select.dog-5 {
        transform: translateX(calc((-100% / var(--dogs)) * 4));
    }
`;

export default {
	name: "Setup",
    inject: ["router"],
	components: { MinimalInput, DogSprite, RetroButton },
	data: () => ({ globalDogName: dogName, globalDogVariant: dogVariant, name: dogName.value, dogVariants: Array.from(DOG_VARIANTS), dogVariantIndexShown: Math.max(dogVariants.indexOf(dogVariant.value), 0) }),
    computed: {
        dogVariantShown() {
            return this.dogVariants[this.dogVariantIndexShown];
        }
    },
	methods: {
		confirm() {
			this.globalDogName = this.name;
			this.globalDogVariant = this.dogVariantShown;
			this.router.goTo('Home');
		},
	},
	template: /* html */`
    <div class="${styles}">
        <MinimalInput class="input" label="Name your dog" type="text" v-model="name" />
        <div class="dog-select-wrapper">
            <button class="previous-dog" @click="dogVariantIndexShown = (dogVariantIndexShown - 1 + dogVariants.length) % dogVariants.length">←</button>
            <div class="dog-select" :class="'dog-' + (dogVariantIndexShown + 1)">
                <div class="dog-wrapper" v-for="variant in dogVariants" :key="variant">
                    <DogSprite :variant="variant" :animating="true" />
                </div>
            </div>
            <button class="next-dog" @click="dogVariantIndexShown = (dogVariantIndexShown + 1) % dogVariants.length">→</button>
        </div>
        <RetroButton @click="confirm">Confirm</RetroButton>
    </div>
	`
}