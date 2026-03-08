// ── Plants ────────────────────────────────────────────────────────────────────
// Keys are exact HA plant entity_ids (e.g. 'plant.big_coffee_plant').
// Find entity_ids in HA → Developer Tools → States (filter for plant.*),
// or from the Plants page once connected — entity_id is shown in the URL
// when you click a plant in HA.
// Status ranges come from HA's Plant integration (OpenPlantbook). Only
// cosmetic attrs (emoji, size) live here.

export const KNOWN_PLANTS = {
    'plant.monstera': {
        image: './assets/plants/monstera.png',
        size:  'large',
    },
    'plant.big_coffee_plant': {
        image: './assets/plants/coffee-plant.png',
        size:  'medium',
    },
    'plant.bonsai_tree': {
        image: './assets/plants/bonsai-tree.png',
        size:  'small',
    },
    'plant.flamingo_flower': {
        image: './assets/plants/flamingo-plant.png',
        size:  'medium',
    },
    'plant.golden_dragon_tree': {
        image: './assets/plants/dragon-plant.png',
        size:  'medium',
    },
    'plant.golden_pothos': {
        image: './assets/plants/seedling.png',
        size:  'medium',
    },
    'plant.monkey_monstera': {
        image: './assets/plants/monkey-monstera.png',
        size:  'small',
    },
    'plant.monkey_monstera_blue_pot': {
        image: './assets/plants/monkey-monstera.png',
        size:  'small',
    },
    'plant.sand_dollar_cactus': {
        image: './assets/plants/sand-dollar-cactus.png',
        size:  'small',
    },
};

export const DEFAULT_PLANT = {
    image: './assets/plants/generic-plant.png',
    size:  'medium',
};
