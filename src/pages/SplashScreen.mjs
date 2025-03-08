import { css, keyframes } from "goober";
import { DOG_STATES, DOG_VARIANTS } from "../constants.mjs";
import { dogVariant } from "../services/data.mjs";


const fadeAnimation = keyframes`
    0% {
        opacity: 1;
    }

    100% {
        opacity: 0;
    }
`;

const styles = css`
    & {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        overflow: hidden;
        font-family: sans-serif;
        font-size: 16px;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    &:not(.loading) .logo {
        width: 33%;
        animation: ${fadeAnimation} 0.5s 2s forwards;
    }
`;

const preloadImage = (url) => new Promise((resolve, reject) =>{
    const img = new Image();
    img.src = url;
    img.onload = resolve;
    img.onerror = reject;
});

export default {
    name: 'SplashScreen',
    inject: ['router'],
    data: () => ({ error: null, loaded: false }),
    created() {
        const promises = [];
        for (const variant of DOG_VARIANTS) {
            for (const state of DOG_STATES) {
                promises.push(preloadImage(`./assets/dogs/${variant}/${state}.png`));
            }
        }
        Promise.all(promises).then(() => this.loaded = true);
    },
    mounted() {
        this.$refs.logo.addEventListener('animationend', () => {
            if (dogVariant.value === null) {
                this.router.goTo('Setup');
            } else {
                this.router.goTo('Home');
            }
        });
    },
    template: /*html*/`
    <div class="${styles}" :class="{ loading: !loaded }">
        <img ref="logo" src="./assets/logo.png" alt="Logo" class="logo" />
    </div>`
}