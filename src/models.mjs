import { getUid } from "./utilities/string.mjs";

/**
 * @typedef {{ id: string; name: string; days: number[] }} Member
 */

/** @type {(name: string, days: number[]) => Member} */
export const createMember = (name = '', days = []) => ({
    id: getUid(),
    name,
    days
});

/** @type {(name: string, members: Member[], requiredPerDay: number) => Role} */
export const createRole = (name = '', members = [], requiredPerDay = 1) => ({
    id: getUid(),
    name,
    members: members.map(({ id }) => id),
    requiredPerDay
});