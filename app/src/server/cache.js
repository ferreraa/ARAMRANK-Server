'use strict'

class Cache {
    #cacheData;
    #maxItems;

    constructor(maxItems = -1) {
        this.#maxItems = maxItems;
        this.#cacheData = new Map();
    }

    has(key) {
        return this.#cacheData.has(key);
    }

    delete(key) {
        return this.#cacheData.delete(key);
    }

    set(key, value) {
        if (
            this.#maxItems < 0
            || this.#maxItems > this.#cacheData.size
            || this.has(key)
        ) {
            this.#cacheData.set(key, value);
            return true;
        }
        
        console.log(`cache maximum size reached (${this.#maxItems})`);
        return false;
    }

    get(key) {
        return this.#cacheData.get(key);
    }

    get isFull() {
        return this.#cacheData.size >= this.#maxItems;
    }
}

const blackListCache = new Cache(5000);

module.exports.blackListCache = blackListCache;