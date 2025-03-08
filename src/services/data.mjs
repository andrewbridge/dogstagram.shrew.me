import { ref, computed } from "vue";
import { clampedRef, persistRef, trackRef } from "../utilities/vue.mjs";
import EventBus from "../utilities/functions.mjs";

export const events = new EventBus();

export const accountBalance = clampedRef(10, { min: 0 });
persistRef(accountBalance, "DOGSTAGRAM_ACCOUNT_BALANCE", true);

export const dogName = ref('');
persistRef(dogName, "DOGSTAGRAM_DOG_NAME", true);
export const setDogName = (name) => {
    dogName.value = name;
};

export const dogVariant = ref(null);
persistRef(dogVariant, "DOGSTAGRAM_DOG_VARIANT", true);
export const setDogVariant = (variant) => {
    dogVariant.value = variant;
};

export const dogHappiness = clampedRef(50, { min: 0, max: 100 });
persistRef(dogHappiness, "DOGSTAGRAM_DOG_HAPPINESS", true);
const lastHappinessChange = trackRef(dogHappiness);
persistRef(lastHappinessChange, "DOGSTAGRAM_LAST_PET", true);
const PET_COST = 5;
export const canPet = computed(() => accountBalance.value >= PET_COST);
export const petDog = () => {
	if (!canPet.value) {
		throw Error('Balance too low');
	}
	accountBalance.value -= PET_COST;
	dogHappiness.value = Math.min(dogHappiness.value + 5, 100);
    events.emit("dog-pet", { happiness: dogHappiness.value });
}

export const dogHunger = clampedRef(50, { min: 0, max: 100 });
persistRef(dogHunger, "DOGSTAGRAM_DOG_HUNGER", true);
const lastHungerChange = trackRef(dogHunger);
persistRef(lastHungerChange, "DOGSTAGRAM_LAST_FED", true);
const FEED_COST = 3;
export const canFeed = computed(() => accountBalance.value >= FEED_COST);
export const feedDog = () => {
	if (!canFeed.value) {
		throw Error('Balance too low');
	}
	accountBalance.value -= FEED_COST;
	dogHunger.value = Math.min(dogHunger.value - 5, 100);
    events.emit("dog-fed", { hunger: dogHunger.value });
}

// Let's adjust the values every half hour
const HOUR = 3600000;
const adjustValues = () => {
    const now = Date.now();
    const lastPetTimeDiff = now - lastHappinessChange.value;
    const happinessReductionMultiplier = Math.floor(lastPetTimeDiff / HOUR);

    if (dogHappiness.value > 75) dogHappiness.value -= 2 * happinessReductionMultiplier;
    else if (dogHappiness.value > 25) dogHappiness.value -= happinessReductionMultiplier;

    const lastFedTimeDiff = now - lastHungerChange.value;
    const hungerReductionMultiplier = Math.floor(lastFedTimeDiff / HOUR);

    if (dogHunger.value > 75 && dogHunger.value < 100) dogHunger.value += hungerReductionMultiplier;
    else if (dogHunger.value < 25 && dogHunger.value >= 0) dogHunger.value += 3 * hungerReductionMultiplier;
}
setInterval(adjustValues, HOUR);
adjustValues();