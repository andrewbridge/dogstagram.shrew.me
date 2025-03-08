import { css } from "../deps/goober.mjs";
import { reactive } from "../deps/vue.mjs";

import BejeweledGame from "../services/games/BejeweledGame.mjs";

const game = reactive(new BejeweledGame());

const styles = css`
    .selected {
        filter: brightness(1.2);
    }
`;

export default {
    components: {  },
    data: () => ({ game }),
    methods: {
        async selectTile(x, y) {
            const shouldProcess = game.selectTile(x, y);
            await this.$nextTick();
            if (!shouldProcess) return;
            while (game.processReaction()) {
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.$nextTick();
            }
        },
    },
    template: `<div class="page ${styles}">
        <p>Score: {{ game.score }}</p>
        <table class="game-table">
            <tr v-for="(row, i) in game.grid" :key="i">
                <td v-for="(tile, j) in row" :key="j" @click="selectTile(j, i)" :class="{ selected: game.selectedTile && game.selectedTile.x === j && game.selectedTile.y === i }" :style="{ backgroundColor: tile }">{{ tile }}</td>
            </tr>
        </table>
    </div>`,
}