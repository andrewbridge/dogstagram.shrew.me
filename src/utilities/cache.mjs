/**
 * Cache utilities backed by localStorage (small data) and IndexedDB (large data).
 * All entries are stored as { data, timestamp }.
 */

import { idbGet, idbPut } from './idb.mjs';

const IDB_STORE = 'data';

// ── localStorage cache (small payloads) ─────────────────────────────────────

export function readCache(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.timestamp !== 'number') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
        console.log('Cache write failed, likely due to quota limits.', e);
    }
}

export function isCacheFresh(key, maxAgeMs) {
    const cached = readCache(key);
    if (!cached) return false;
    if (maxAgeMs === Infinity) return true;
    return (Date.now() - cached.timestamp) < maxAgeMs;
}

export function clearCache(key) {
    localStorage.removeItem(key);
}

// ── IndexedDB cache (large payloads) ────────────────────────────────────────

export async function readCacheIDB(key) {
    try {
        const entry = await idbGet(IDB_STORE, key);
        if (!entry || typeof entry.timestamp !== 'number') return null;
        return entry;
    } catch {
        return null;
    }
}

export async function writeCacheIDB(key, data) {
    try {
        await idbPut(IDB_STORE, { data, timestamp: Date.now() }, key);
    } catch (e) {
        console.log('IDB cache write failed:', e);
    }
}

export async function isCacheFreshIDB(key, maxAgeMs) {
    const cached = await readCacheIDB(key);
    if (!cached) return false;
    if (maxAgeMs === Infinity) return true;
    return (Date.now() - cached.timestamp) < maxAgeMs;
}

export async function clearCacheIDB(key) {
    try {
        await idbPut(IDB_STORE, undefined, key);
    } catch {
        // ignore
    }
}
