/**
 * @file See http://en.wikipedia.org/wiki/Skip_list
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

var assert = require("assert");

var MAX_HEIGHT = 12;
var INSERTION_PROBABILITY = 0.5;

class Item<T extends { idx: number }> {
    nexts: Array<Item<T>>;
    prev: Item<T>;
    payload: T;
    removalToken: number;

    constructor(payload: T, nexts?: Array<Item<T>>, prev?: Item<T>) {
        this.payload = payload;
        this.nexts = nexts || [];
        this.prev = prev || null;
        if (!nexts) {
            payload.idx = prev ? prev.payload.idx + 1 : 0;
        } else {
            assert(prev);
            payload.idx = (prev.payload.idx + nexts[0].payload.idx)/2;
        }
    }

    static makeRoot<T extends { idx: number }>(payload: T, layers: Array<Item<T>>) {
        var ret = new Item(payload);
        for (var i = 0; i < MAX_HEIGHT; ++i) {
            layers[i] = ret;
        }
        return ret;
    }

    /**
     * Insert an element before the current element without propegating to higher levels,
     * ensuring constant time, but reducing the overall efficiency of the structure.
     * 
     * O(1)
     */
    insertBefore(payload: T) {
        // This is an append and swap, rather than a true prepend.
        // Useful because that way this.curr() is still up to date.
        this.insertAfter(this.payload);
        this.payload = payload;
        return this;
    }

    /**
     * Insert an element after the current element without propegating to higher levels,
     * ensuring constant time, but reducing the overall efficiency of the structure.
     * 
     * O(1)
     */
    insertAfter(payload: T) {
        this.nexts = [new Item(payload, this.nexts, this)];
        return this.next;
    }

    /**
     * Appends an element, given the final elements in other skip lists.
     * 
     * O(1)
     * 
     * @param layers the final elements in each layer of the skiplist.
     */
    build(payload: T, layers: Array<Item<T>>): Item<T> {
        assert(!this.next);
        assert(layers[0] === this);

        var item = new Item(payload, null, this);
        item.payload.idx = this.payload.idx + 1;
        var height = 0;
        do {
            if (layers[height]) {
                layers[height].nexts.push(item);
            }
            layers[height] = item;

            height++;
        } while (height + 1 < MAX_HEIGHT && Math.random() < INSERTION_PROBABILITY);

        return this.next;
    }

    finish(layers: Array<Item<T>>) {
        for (var i = 0; i < layers.length; ++i) {
            if (layers[i] !== this) {
                layers[i].nexts.push(this);
            }
            layers[i] = null;
        }
    }

    /**
     * If removing the item would have linear complexity, removes it.
     * Otherwise, nullify it.
     * 
     * O(1)
     */
    erase() {
        if (this.isRoot) {
            this.payload = this.next.payload;
            this.next.erase();
            return this;
        } else {
            this.removalToken = this.idx;
            this.payload = null;
            if (!this.nexts[1]) {
                this.prev.next = this.next;
                this.next.prev = this.prev;
            }
            return this.next;
        }
    }

    get next(): Item<T> {
        if (this.nexts[0] && !this.nexts[0].payload) {
            return this.nexts[0].next;
        }
        return this.nexts[0];
    }

    set next(next: Item<T>) {
        this.nexts[0] = next;
    }

    get isRoot(): boolean {
        return !this.prev;
    }

    set isRoot(r: boolean) {
        assert(false, "You cannot make a root. It must start out that way.");
    }

    get idx() {
        if (this.removalToken !== undefined) {
            assert(!this.payload, "Item was not removed");
            return this.removalToken;
        }
        assert(this.payload, "Item was removed without providing a removal token");
        return this.payload.idx;
    }

    /**
     * For debugging.
     */
    stepsTo(idx: number) {
        if (!this.payload) {
            var next = this.next;
            if (next && next.idx <= idx) {
                var steps = next.stepsTo(idx);
                return steps === -1 ? -1 : steps;
            }
            return -1;
        }
        if (this.idx === idx) {
            return 0;
        }
        for (var i = this.nexts.length; i >= 0; --i) {
            if (this.nexts[i] && this.nexts[i].idx <= idx) {
                var steps = this.nexts[i].stepsTo(idx);
                return steps === -1 ? -1 : steps + 1;
            }
        }
        return -1;
    }

    /**
     * Retreives item with 'idx'.
     * 
     * O(lg n) expected.
     */
    seek(idx: number): Item<T> {
        if (!this.payload) {
            var next = this.next;
            if (next && next.idx <= idx) {
                return next.seek(idx);
            }
            return null;
        }
        if (this.idx === idx) {
            return this;
        }
        for (var i = this.nexts.length; i >= 0; --i) {
            if (this.nexts[i] && this.nexts[i].idx <= idx) {
                return this.nexts[i].seek(idx);
            }
        }
        return null;
    }

    static INSERTION_PROBABILITY = INSERTION_PROBABILITY;
    static MAX_HEIGHT = MAX_HEIGHT;
}

export = Item;