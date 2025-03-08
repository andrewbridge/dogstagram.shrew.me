import { css, keyframes } from "goober";

const slideUpAnimation = keyframes`
    0% {
        transform: translateY(100%);
    }

    100% {
        transform: translateY(0);
    }
`;

const styles = css`
    & {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-around;
        height: calc(100vh - 1.5vh);
        width: calc(100% - 1.5vh);
        font-family: sans-serif;
        font-size: 1em;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        animation: ${slideUpAnimation} 0.5s forwards;
        background: #ce3ba4;
        box-shadow: inset -1vh -1vh 0px 0px #a22c81;
        position: fixed;
        bottom: .75vh;
        left: .75vh;
        font-family: "Press Start 2P", cursive;
        text-decoration: none;
        color: white;
        z-index: 100;

        &::before, &::after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            box-sizing: content-box;
        }

        &::before {
            top: -.75vh;
            left: 0;
            border-top: .75vh #c7c7c7 solid;
            border-bottom: .75vh #c7c7c7 solid;
        }

        &::after {
            left: -.75vh;
            top: 0;
            border-left: .75vh #c7c7c7 solid;
            border-right: .75vh #c7c7c7 solid;
        }
    }

    & h1 {
        text-align: center;
        line-height: 1.3;
    }

    & > * {
        z-index: 1;
    }

    &.v-enter-active,
    &.v-leave-active {
        transition: transform 0.5s ease;
    }

    &.v-enter-from,
    &.v-leave-to {
        transform: translateY(100%);
    }
`;

export default {
    name: 'GameCompleteScreen',
    props: {
        show: {
            type: Boolean,
            default: false,
        }
    },
    template: /* html */`
    <Transition>
        <div v-if="show" class="${styles}">
            <slot />
        </div>
    </Transition>
    `,
}