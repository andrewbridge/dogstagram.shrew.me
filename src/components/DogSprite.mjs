import { css, keyframes } from "goober";

const playSpriteAnimation = keyframes`
    100% {
        background-position: calc((100% / var(--divider)) * var(--sprite-animation-steps));
    }
`;

const styles = css`
    & {
        --player-width: 20vh;
        --player-height: 20vh;
        --sprite-animation-speed: .5s;
    }

    & .sprite {
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        background-size: auto 100%;
        background-position: left center;
        --divider: calc(var(--sprite-animation-steps) - 1);
        animation: ${playSpriteAnimation} var(--sprite-animation-speed, .5s) steps(var(--sprite-animation-steps)) infinite;
        animation-play-state: var(--sprite-animation-play-state, paused);
    }

    &.walking, &.crouched {
        --sprite-animation-steps: 7;
    }

    &.sniffing {
        --sprite-animation-steps: 7;
    }

    &.sitting {
        --sprite-animation-steps: 5;
        --sprite-animation-speed: .75s;
    }

    &.running {
        --sprite-animation-steps: 3;
    }

    &.lying {
        --sprite-animation-steps: 3;
        --sprite-animation-speed: .75s;
    }

    &.jumping {
        --sprite-animation-steps: 5;
    }

    &.eating {
        --sprite-animation-steps: 6;
    }

    &.right .sprite {
        scale: 1 1;
    }

    &.left .sprite {
        scale: -1 1;
    }

    & {
        width: var(--player-width);
        height: var(--player-height);
        margin-top: var(--player-position);
        transition: 1.5s margin-left linear;
    }

    &.animating {
        --sprite-animation-play-state: running;
    }
`;

export default {
    name: 'DogSprite',
    props: {
        variant: {
            type: String,
            default: 'white',
        },
        state: {
            type: String,
            default: 'walking',
        },
        animating: {
            type: Boolean,
            default: false,
        },
        direction: {
            type: String,
            default: 'right',
        }
    },
    computed: {
        spriteImage() {
            return `./assets/dogs/${this.variant}/${this.state}.png`;
        },
        // spriteAnimationSpeed() {
        //     return this.animating ? '.5s' : '0s';
        // },
        // spriteAnimationPlayState() {
        //     return this.animating ? 'running' : 'paused';
        // },
    },
    template: /* html */`
    <div class="${styles}" :class="{ animating, [state]: true, [direction]: true }">
        <div class="sprite" :style="{ backgroundImage: 'url(' + spriteImage + ')' }"></div>
    </div>`
}