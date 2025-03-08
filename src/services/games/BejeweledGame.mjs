export default class BejeweledGame {
    constructor(rows = 8, cols = 8) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];
        this.colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
        this.selectedTile = null;
        this.swappedTile = null;
        this.emptySpaces = false;
        this.score = 0;
        this.init();
    }

    init() {
        // Initialize grid with random colors
        for (let i = 0; i < this.rows; i++) {
            this.grid[i] = [];
            for (let j = 0; j < this.cols; j++) {
                this.grid[i][j] = this.getRandomColorWithoutMatch(i, j);
            }
        }
    }

    getRandomColorWithoutMatch(row, col) {
        // Get a random color that doesn't create a match
        let availableColors = [...this.colors];

        // Check horizontal matches (need at least 2 previous columns to form a match)
        if (col >= 2) {
            if (this.grid[row][col-1] === this.grid[row][col-2]) {
                const matchColor = this.grid[row][col-1];
                availableColors = availableColors.filter(color => color !== matchColor);
            }
        }

        // Check vertical matches (need at least 2 previous rows to form a match)
        if (row >= 2) {
            if (this.grid[row-1][col] === this.grid[row-2][col]) {
                const matchColor = this.grid[row-1][col];
                availableColors = availableColors.filter(color => color !== matchColor);
            }
        }

        // If we filtered out all colors, reset to full color list
        if (availableColors.length === 0) {
            availableColors = [...this.colors];
        }

        return availableColors[Math.floor(Math.random() * availableColors.length)];
    }

    /**
     * Select a tile at the given position.
     * 
     * Behaviour of selecting a tile:
     * - If no tile is selected, select the tile
     * - If a tile is already selected and the new tile is not adjacent to it, select this as a new starting tile
     * - If a tile is already selected and the new tile is adjacent to it, swap the tiles
     * - If the same tile is clicked again, unselect it
     * 
     * @param {number} x The x position of the tile in the grid
     * @param {number} y The y position of the tile in the grid
     * @returns {boolean} Whether the a reaction must be processed to progress the game
     */
    selectTile(x, y) {
        if (this.selectedTile !== null && this.isAdjacent(this.selectedTile, {x, y})) {
            this.swapTiles(this.selectedTile, {x, y});
            this.swappedTile = {x, y};
            return true;
        }
        
        // Unselect tile if clicked again
        if (this.selectedTile !== null && this.selectedTile.x === x && this.selectedTile.y === y) {
            this.selectedTile = null;
        } else {
            this.selectedTile = {x, y};
        }

        return false;
    }

    isAdjacent(tile1, tile2) {
        const dx = Math.abs(tile1.x - tile2.x);
        const dy = Math.abs(tile1.y - tile2.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    swapTiles(tile1, tile2) {
        const temp = this.grid[tile1.y][tile1.x];
        this.grid[tile1.y][tile1.x] = this.grid[tile2.y][tile2.x];
        this.grid[tile2.y][tile2.x] = temp;
    }

    /**
     * Process the reaction a tile swap has caused.
     * 
     * @returns {boolean} Whether further reactions must be processed before continuing
     */
    processReaction() {
        if (this.emptySpaces) {
            // If there are empty spaces, fill them and check for matches again
            this.emptySpaces = false;
            this.fillEmptySpaces();
            return true;
        }
        
        if (this.checkMatches()) {
            // Forget the swapped tile as there's at least one match
            this.swappedTile = null;
            // If there are matches, they will have been removed
            this.emptySpaces = true;
            return true;
        }

        if (this.swappedTile !== null) {
            // There aren't any matches so swap back
            this.swapTiles(this.selectedTile, this.swappedTile);
            this.swappedTile = null
        }

        this.selectedTile = null;
        return false;
    }

    checkMatches() {
        let hasMatches = false;
        let matchedTiles = new Set();

        // Check horizontal matches
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols - 2; j++) {
                if (this.grid[i][j] &&
                    this.grid[i][j] === this.grid[i][j + 1] &&
                    this.grid[i][j] === this.grid[i][j + 2]) {

                    hasMatches = true;
                    this.score += 100;

                    // Add all matched positions to the set
                    matchedTiles.add(`${i},${j}`);
                    matchedTiles.add(`${i},${j+1}`);
                    matchedTiles.add(`${i},${j+2}`);
                }
            }
        }

        // Check vertical matches
        for (let i = 0; i < this.rows - 2; i++) {
            for (let j = 0; j < this.cols; j++) {
                if (this.grid[i][j] &&
                    this.grid[i][j] === this.grid[i + 1][j] &&
                    this.grid[i][j] === this.grid[i + 2][j]) {

                    hasMatches = true;
                    this.score += 100;

                    // Add all matched positions to the set
                    matchedTiles.add(`${i},${j}`);
                    matchedTiles.add(`${i+1},${j}`);
                    matchedTiles.add(`${i+2},${j}`);
                }
            }
        }

        // Mark all matched tiles as null
        for (const position of matchedTiles) {
            const [i, j] = position.split(',').map(Number);
            this.grid[i][j] = null;
        }

        return hasMatches;
    }

    fillEmptySpaces() {
        // Move tiles down
        for (let j = 0; j < this.cols; j++) {
            // Count empty spaces from bottom to top
            let emptySpaces = 0;
            for (let i = this.rows - 1; i >= 0; i--) {
                if (this.grid[i][j] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Move tile down by the number of empty spaces
                    this.grid[i + emptySpaces][j] = this.grid[i][j];
                    this.grid[i][j] = null;
                }
            }

            // Fill top empty spaces with new colors
            for (let i = emptySpaces - 1; i >= 0; i--) {
                this.grid[i][j] = this.colors[Math.floor(Math.random() * this.colors.length)];
            }
        }
    }
}
