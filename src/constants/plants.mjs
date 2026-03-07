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
