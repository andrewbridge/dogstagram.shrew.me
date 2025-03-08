export default class EventBus {
    #listeners = {
        '*': new Set(),
    };
    
    static #checkParameters(event, listener) {
        if (typeof event !== 'string') throw Error('The event passed was not a string');
        if (typeof listener !== 'function') throw Error('The listener passed was not a function');
    }
    
    addListener(event, listener) {
        EventBus.#checkParameters(event, listener);
        if (!(event in this.#listeners)) {
            this.#listeners[event] = new Set();
        }
        this.#listeners[event].add(listener);
        // Return a function that can be used to remove the listener later on
        return () => this.removeListener(event, listener);
    }
    
    removeListener(event, listener) {
        EventBus.#checkParameters(event, listener);
        if (!(event in this.#listeners)) return;
        this.#listeners[event].delete(listener);
    }
    
    emit(event, payload) {
        if (event !== '*') {
            this.emit('*', { event, payload });
        }
        if (!(event in this.#listeners)) return;
        this.#listeners[event].forEach((listener) => {
            try {
                listener(payload);
            } catch (error) {
                console.error(`[EventBus] Error occurred while emitting "${event}"`, error);
            }
        });
    }
}