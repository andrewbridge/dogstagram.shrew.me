import { css } from "goober";

const styles = css`
& {
    -webkit-appearance: none;
    appearance: none;
    background: #373737;
    display: inline-block;
    position: relative;
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

&::-webkit-progress-bar {
    background-color: transparent;
}

&::-webkit-progress-value {
    background-color: var(--progress-color, #92CD41);
    box-shadow: inset -4px -4px 0px 0px var(--progress-shadow, #4AA52E);
}

&::-moz-progress-bar {
    background-color: var(--progress-color, #92CD41);
    box-shadow: inset -4px -4px 0px 0px var(--progress-shadow, #4AA52E);
}

&.success {
    --progress-color: #92CD41;
    --progress-shadow: #4AA52E;
}

&.danger {
    --progress-color: #CD3F3F;
    --progress-shadow: #A52E2E;
}

&.warning {
    --progress-color: #E1B22A;
    --progress-shadow: #A57D2E;
}

&.info {
    --progress-color: #2A8FE1;
    --progress-shadow: #2E5AA5;
}
`;

export default {
    name: 'RetroProgress',
    props: {
        value: {
            type: Number,
            required: true
        },
        variant: {
            type: String,
            default: "success",
        },
    },
    template: /* html */`
        <progress class="${styles}" :class="variant" :value="value">{{value}}</progress>
    `,
}