export const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('dogstagram-data-cache', 1);
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('data')) {
            db.createObjectStore('data');
        }
    };
    request.onsuccess = function(event) {
        resolve(event.target.result);
    };
    request.onerror = function(event) {
        reject(event.target.error);
    };
});

export async function idbGetStore(storeName, mode) {
    const db = await dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
}

export async function idbStoreAction(storeName, mode, action, ...actionArgs) {
    const store = await idbGetStore(storeName, mode);
    return new Promise((resolve, reject) => {
        const request = store[action](...actionArgs);
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

export function idbGet(storeName, key) {
    return idbStoreAction(storeName, 'readonly', 'get', key);
}

export function idbPut(storeName, value, key) {
    return idbStoreAction(storeName, 'readwrite', 'put', value, key);
}