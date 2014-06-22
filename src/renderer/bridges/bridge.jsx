/**
 * Subclasses of Bridges handle the gap between the abstract representation of
 * a score (as, for example, parsed in lylite.jison) and the actual rendering
 * (which is done by components in ./primitives).
 *
 * In particular, classes which extend Bridge provide three key items:
 *   - prereqs: an array of prerequisites. Each prerequisite is an array with
 *      the following:
 *        1. a function which accepts a cursor and returns true if the
 *           precondition is satisfied and false otherwise.
 *        2. a function which accepts a cursor, stave, and idx and performs
 *           actions which make the precondition true. The exit code is one
 *           of the following:
 *
 *             true:   the precondition is now met, and the annotater should
 *                     continue at annotating at 'idx + 1'.
 *             
 *             false:  the precondition is now met, but the entire document
 *                     needs to be re-rendered.
 *
 *             -1:     the precondition is now met, but the annotater should
 *                     re-annotate the object at 'idx + 1'.
 *
 *             "line": the precondition is now met, but the annotater should
 *                     re-annotate the current line.
 *
 *             "line_created": the precondition is now met, but a line was
 *                     added somewhere between where the previous line was and
 *                     idx. The annotater should re-annotate the previous two
 *                     lines.
 *        3. A description of the precondition, in English, for debugging.
 *             
 *   - annotateImpl: adds any missing information (default values) not provided
 *      by the parser, adds any missing elements (e.g., clefs, time signatures,
 *      line breaks) to stave.body
 *   - render: returns the instance of a React component which renders the
 *      component. Does not accept anything. Any processing should be done in
 *      annotateImpl.
 *
 * To see the kind of information held by Bridges, in your web browser's
 * console, run 'SongEditorStore.staves()[3].body'. Every item is a Bridge.
 */

var assert = require("assert");
var _ = require("underscore");

class Bridge {
    annotate(cursor, stave, idx) {
        if (!this.inBeam) {
            this.setX(cursor.x);
            this.setY(cursor.y);
        }
        for (var i = 0; i < this.prereqs.length; ++i) {
            if (!this.prereqs[i][0 /* condition */].call(this, cursor, stave, idx)) {
                var exitCode = this.prereqs[i][1 /* correction */].call(this, cursor, stave, idx);
                if (exitCode !== true) {
                    return exitCode;
                }
            }
        }

        var ret = this.annotateImpl(cursor, stave, idx);
        if (ret !== true) {
            return ret;
        }

        this._key = this._keyForCursor(cursor);
        return ret;
    }

    constructor(spec) {
        assert(this instanceof Bridge);
        for (var prop in spec) {
            if (spec.hasOwnProperty(prop)) {
                this[prop] = spec[prop];
            }
        }
        this.name = Object.getPrototypeOf(this).constructor.name;
    }

    _keyForCursor(cursor) {
        cursor.renderKey_eInBar = cursor.renderKey_eInBar || {};
        cursor.renderKey_eInBar[this.name] = cursor.renderKey_eInBar[this.name] + 1 || 1;
        return cursor.bar + "_" + cursor.renderKey_eInBar[this.name] + this.name;
    }

    key() {
        return this._key;
    }

    annotateImpl(cursor, stave, idx) {
        assert(false, "Not implemented");
    }
    visible() {
        return true;
    }
    render() {
        assert(false, "Not implemented");
    }

    // Convienience
    nextNote(stave, idx, inBar) {
        var ret = _(stave.body.slice(idx + 1)).find(p => p.pitch || p.chord || (p.barline && inBar));
        if (ret && ret.barline) return false;
        return ret;
    }
    prevNote(stave, idx) {
        return _(stave.body.reverse().slice(idx + 1)).find(p => p.pitch || p.chord);
    }
    next(stave, idx) {
        var ret = stave.body[idx + 1] || {};
        if (ret.beam) {
            return this.next(stave, idx + 1);
        }
        return ret;
    }
    prev(stave, idx) {
        var ret = stave.body[idx - 1] || {};
        if (ret.beam) {
            return this.prev(stave, idx - 1);
        }
        return ret;
    }
    x() {
        return this._x;
    }
    y() {
        return this._y;
    }
    setX(x) {
        this._x = x;
    }
    setY(y) {
        this._y = y;
    }
}

/**
 * Given an array of staves, remove all annotated objects
 * created through a Bridge.
 */
var removeAnnotations = (staves) => {
    for (var i = 0; i < staves.length; ++i) {
        for (var j = 0; staves[i].body && j < staves[i].body.length; ++j) {
            var item = staves[i].body[j];
            if (item._annotated) {
                staves[i].body.splice(j, 1);
                --j;
            } else if (item.inBeam) {
                delete item.inBeam;
            }
        }
    }
};

module.exports = Bridge;
module.exports.removeAnnotations = removeAnnotations;
