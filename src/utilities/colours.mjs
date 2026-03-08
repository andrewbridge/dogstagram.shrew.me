import { CARD_HUES } from '../constants/colours.mjs';

/** Hash a string to one of the provided hues. */
export function nameToHue(name, hues = CARD_HUES) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    return hues[((h % hues.length) + hues.length) % hues.length];
}
