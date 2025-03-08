import { css } from "goober";

const styles = css`
    & {
        background: var(--button-idle-color, #92CD41);
        display: inline-block;
        position: relative;
        text-align: center;
        font-size: 1.25em;
        padding: 1em;
        font-family: "Press Start 2P", cursive;
        text-decoration: none;
        color: white;
        box-shadow: inset -4px -4px 0px 0px var(--button-shadow, #4AA52E);

        &::before, &::after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            box-sizing: content-box;
            border-radius: inherit;
        }

        &::before {
            top: -.8vh;
            left: 0;
            border-top: .8vh black solid;
            border-bottom: .8vh black solid;
        }

        &::after {
            left: -.8vh;
            top: 0;
            border-left: .8vh black solid;
            border-right: .8vh black solid;
        }
    }

    &:hover, &:focus {
        background: var(--button-hover-color, #76c442);
        box-shadow: inset -6px -6px 0px 0px var(--button-shadow, #4AA52E);
    }

    &.success {
        --button-idle-color: #92CD41;
        --button-shadow: #4AA52E;
        --button-hover-color: #76c442;
    }

    &.danger {
        --button-idle-color: #CD3F3F;
        --button-shadow: #A52E2E;
        --button-hover-color: #C44242;
    }

    &.warning {
        --button-idle-color: #E1B22A;
        --button-shadow: #A57D2E;
        --button-hover-color: #C4A42E;
    }

    &.info {
        --button-idle-color: #2A8FE1;
        --button-shadow: #2E5AA5;
        --button-hover-color: #2E76C4;
    }
`;

export default {
    name: "RetroButton",
    props: {
        variant: {
            type: String,
            default: "success",
        },
    },
    template: /* html */`
        <button class="${styles}" :class="variant">
            <slot />
        </button>
    `,
}