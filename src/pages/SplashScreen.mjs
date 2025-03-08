import { css, keyframes } from "goober";
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

    & .logo {
        width: 33%;
        animation: ${fadeAnimation} 0.5s 2s forwards;
    }
`;

export default {
    name: 'SplashScreen',
    inject: ['router'],
    data: () => ({ error: null }),
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
    <div class="${styles}">
        <img ref="logo" src="./assets/logo.png" alt="Logo" class="logo" />
    </div>`
}