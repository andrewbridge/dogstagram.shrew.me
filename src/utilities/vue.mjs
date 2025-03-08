import { watchEffect, watch, ref, computed } from 'vue';
import { clamp } from './number.mjs';

export const persistRef = (ref, persistKey, permanently = false) => {
    const storage = permanently ? window.localStorage : window.sessionStorage;
    if (persistKey in storage) {
        ref.value = JSON.parse(storage.getItem(persistKey));
    }
    watchEffect(() => storage.setItem(persistKey, JSON.stringify(ref.value)));
}

export const clampedRef = (value, { min = -Infinity, max = Infinity } = {}) => {
    const _value = ref(value);
    return computed({
        get: () => _value.value,
        set: (newValue) => (_value.value = clamp(min, newValue, max)),
    });
};

export const trackRef = (trackedRef) => {
    const _value = ref(Date.now());
    watch(trackedRef, () => (_value.value = Date.now()));
    return _value;
};