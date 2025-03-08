import { css } from "goober";

const styles = css`
    & {
        background: #373737;
        display: inline-block;
        position: absolute;
        text-align: center;
        font-size: 1em;
        padding: .75em;
        font-family: "Press Start 2P", cursive;
        text-decoration: none;
        color: white;
        box-shadow: inset -4px -4px 0px 0px #252525;
        text-align: center;

        &::before, &::after {
            content: "";
            position: absolute;
            width: 100%;
            height: 100%;
            box-sizing: content-box;
        }

        &::before {
            top: -.8vh;
            left: 0;
            border-top: .8vh #c7c7c7 solid;
            border-bottom: .8vh #c7c7c7 solid;
        }

        &::after {
            left: -.8vh;
            top: 0;
            border-left: .8vh #c7c7c7 solid;
            border-right: .8vh #c7c7c7 solid;
        }
    }

    &:hover, &:focus {
        background: #323131;
        box-shadow: inset -6px -6px 0px 0px #252525;
    }

    &.bottom {
        bottom: 10vh;
        left: 5vh;
        right: 5vh;
    }

    &.v-enter-active,
    &.v-leave-active {
        transition: opacity 0.5s ease;
    }

    &.v-enter-from,
    &.v-leave-to {
        opacity: 0;
    }
`;

export default {
    name: "RetroToast",
    props: {
        position: {
            type: String,
            default: "bottom",
        },
        show: {
            type: Boolean,
        }
    },
    template: /* html */`
        <Transition>
            <div v-if="show" class="${styles}" :class="position">
                <slot />
            </div>
        </Transition>
    `,
}