/**
 * Subclasses of Bridges handle the gap between the abstract representation of
 * a score (as, for example, parsed in lylite.jison) and the actual rendering
 * (which is done by components in ../primitives).
 *
 * In particular, classes which extend Bridge provide three key methods:
 *   - prereqs: an array of prerequisites. Each prerequisite is an array with
 *      the following:
 *        1. a function which accepts obj and cursor and returns true if the
 *           precondition is satisfied and false otherwise.
 *        2. a function which accepts obj, cursor, stave, and idx and addresses
 *           the precondition. The exit code is one of the following:
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
 *      component.
 */

var assert = require("assert");
var _ = require("underscore");

class Bridge {
    annotate(obj, cursor, stave, idx) {
        var prereqs = this._prereqs;
        if (!obj.inBeam) {
            this.setX(obj, cursor.x);
            this.setY(obj, cursor.y);
        }
        for (var i = 0; i < prereqs.length; ++i) {
            if (!prereqs[i][0 /* condition */](obj, cursor, stave, idx)) {
                var exitCode = prereqs[i][1 /* correction */](obj, cursor, stave, idx);
                if (exitCode !== true) {
                    return exitCode;
                }
            }
        }

        var ret = this.annotateImpl(obj, cursor, stave, idx);
        if (ret !== true) {
            return ret;
        }

        obj._key = this._keyForCursor(cursor);
        return ret;
    }

    constructor() {
        this.name = Object.getPrototypeOf(this).constructor.name;
        this._prereqs = this.prereqs();
    }

    prereqs() {
        assert(false, "Not implemented");
    }

    _keyForCursor(cursor) {
        cursor.renderKey_eInBar = cursor.renderKey_eInBar || {};
        cursor.renderKey_eInBar[this.name] = cursor.renderKey_eInBar[this.name] + 1 || 1;
        return cursor.bar + "_" + cursor.renderKey_eInBar[this.name] + this.name;
    }

    key(obj) {
        return obj._key;
    }

    annotateImpl(obj, cursor, stave, idx) {
        assert(false, "Not implemented");
    }
    visible(obj) {
        return true;
    }
    render(obj) {
        assert(false, "Not implemented");
    }

    // Convienience
    nextNote(stave, idx) {
        return _(stave.body.slice(idx + 1)).find(p => p.pitch || p.chord);
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
    x(obj) {
        return obj._x;
    }
    y(obj) {
        return obj._y;
    }
    setX(obj, x) {
        obj._x = x;
    }
    setY(obj, y) {
        obj._y = y;
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

/**
 * A bridge knows how to annotate and render a certain type of object
 * such as a beam or a clef.
 *
 * See bridge.jsx
 */
var getBridgeForItem = item => {
    if (item._bridge) {
        return item._bridge;
    }

    var ret = _(bridges).find((bridge, name) => item[name]);
    item._bridge = ret;
    return ret;
};

var bridges = {};
_.defer(() => {
    var BarlineBridge = require("../renderer/barlineBridge.jsx");
    var BeamBridge = require("../renderer/beamGroupBridge.jsx");
    var ClefBridge = require("../renderer/clefBridge.jsx");
    var EndMarkerBridge = require("../renderer/endMarkerBridge.jsx");
    var KeySignatureBridge = require("../renderer/keySignatureBridge.jsx");
    var NewPageBridge = require("../renderer/newpageBridge.jsx");
    var NewlineBridge = require("../renderer/newlineBridge.jsx");
    var PitchBridge = require("../renderer/pitchBridge.jsx");
    var SlurBridge = require("../renderer/slurBridge.jsx");
    var TimeSignatureBridge = require("../renderer/timeSignatureBridge.jsx");
    
    _(bridges).extend({
        barline: new BarlineBridge(),
        beam: new BeamBridge(),
        chord: new PitchBridge(),
        clef: new ClefBridge(),
        endMarker: new EndMarkerBridge(),
        keySignature: new KeySignatureBridge(),
        newpage: new NewPageBridge(),
        newline: new NewlineBridge(),
        pitch: new PitchBridge(),
        slur: new SlurBridge(),
        timeSignature: new TimeSignatureBridge()
    });
});

module.exports = Bridge;
module.exports.removeAnnotations = removeAnnotations;
module.exports.getBridgeForItem = getBridgeForItem;
module.exports.bridges = bridges;
