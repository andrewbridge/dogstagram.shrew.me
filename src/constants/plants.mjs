// ── Rooms ─────────────────────────────────────────────────────────────────────
// Keys are exact HA area_ids (find them in HA → Settings → Areas & Zones,
// or check the "Area ID" column in ha-test.html after connecting).
// Only visual/theming attrs here — display names + aliases come from HA.

export const KNOWN_ROOMS = {
    living_room: {
        wallColour:  '#c8b89a',
        floorColour: '#8b7355',
        accentColour:'#d4a76a',
    },
    bedroom: {
        wallColour:  '#b0c4d8',
        floorColour: '#6b8fa6',
        accentColour:'#8eb8d0',
    },
    kitchen: {
        wallColour:  '#e8dcc8',
        floorColour: '#a09070',
        accentColour:'#c8b87a',
    },
    bathroom: {
        wallColour:  '#c4d8d0',
        floorColour: '#7a9e96',
        accentColour:'#9ac4bc',
    },
    office: {
        wallColour:  '#c8c0b4',
        floorColour: '#786858',
        accentColour:'#b0a08a',
    },
    hallway: {
        wallColour:  '#d4c8b4',
        floorColour: '#8c7c64',
        accentColour:'#c0b094',
    },
};

export const DEFAULT_ROOM = {
    wallColour:  '#d0ccc8',
    floorColour: '#8c8884',
    accentColour:'#b8b4b0',
};

// ── Plants ────────────────────────────────────────────────────────────────────
// Keys are exact HA plant entity_ids (e.g. 'plant.big_coffee_plant').
// Find entity_ids in HA → Developer Tools → States (filter for plant.*),
// or from the Plants page once connected — entity_id is shown in the URL
// when you click a plant in HA.
// Status ranges come from HA's Plant integration (OpenPlantbook). Only
// cosmetic attrs (emoji, size) live here.

export const KNOWN_PLANTS = {
    'plant.plant_sensor_monstera': {
        emoji: '🌿',
        size:  'large',
    },
    'plant.big_coffee_plant': {
        emoji: '☕',
        size:  'medium',
    },
};

export const DEFAULT_PLANT = {
    emoji: '🪴',
    size:  'medium',
};
