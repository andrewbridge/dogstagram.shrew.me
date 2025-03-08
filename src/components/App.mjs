import { css } from "goober";
import ProgrammaticModals from "./ProgrammaticModals.mjs";

// These styles will constrain the page to a vertical, mobile-like view, centred on the page
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
        color: #333333;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    & .page-wrapper {
        height: 100%;
        width: 100%;
        background-color: #f0f0f0;
        overflow: hidden;

        @media (min-width: 768px), (orientation: landscape) {
            height: 95vh;
            width: 43.85vh;
        }
    }
`;

export default {
    name: "App",
    components: { ProgrammaticModals },
    inject: ["router"],
    template: `<div class="${styles}">
        <main class="page-wrapper">
            <component :is="router.state.activeRoute" v-bind="router.state.routeParams" />
        </main>
        <ProgrammaticModals />
    </div>`,
}