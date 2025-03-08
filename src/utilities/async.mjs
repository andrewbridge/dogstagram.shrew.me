export const waitForEvent = (element, eventName) =>
    new Promise((resolve, reject) => {
        element.addEventListener(eventName, resolve, { once: true });
    });

export const wait = (timeout) => new Promise(resolve => setTimeout(resolve, timeout));