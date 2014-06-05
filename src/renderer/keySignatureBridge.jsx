/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var _ = require("underscore");

var ClefBridge = require("./clefBridge.jsx");
var KeySignature = require("../primitives/keySignature.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");

var MAJOR = "\\major";
var MINOR = "\\minor";

var isPitch = (k, name, acc) =>
    k.pitch === name && (k.acc || 0) === (acc || 0);

class KeySignatureBridge extends Bridge {
    prereqs() {
        return [
            [
                (obj, cursor) => cursor.clef,
                ClefBridge.createClef,
                "A clef must exist on each line."
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
        obj._clef = cursor.clef;
        var next = this.next(stave, idx);
        if (next.pitch || next.chord) {
            if (next.acc) {
                // TODO: should be 1 if there are more than 1 accidental.
                obj._annotatedSpacing = 2.5;
            } else {
                obj._annotatedSpacing = 1.5;
            }
        } else {
            obj._annotatedSpacing = 1;
        }
        var c = getSharpCount(obj.keySignature) || getFlatCount(obj.keySignature);
        if (c) {
            cursor.x += obj._annotatedSpacing/4 + 0.4*c;
        }
        cursor.keySignature = obj.keySignature;
        cursor.accidentals = getAccidentals(cursor.keySignature);
        return true;
    }
    render(obj) {
        return <KeySignature
            key={this.key(obj)}
            stroke={obj.temporary ? "#A5A5A5" : "black"}
            x={this.x(obj)}
            y={this.y(obj)}
            clef={obj._clef}
            sharpCount={getSharpCount(obj.keySignature)}
            flatCount={getFlatCount(obj.keySignature)} />;
    }
    toLylite(obj, lylite) {
        if (obj["_annotated"]) {
            return;
        }

        var acc = "";
        if (obj.keySignature.acc === -1) {
            acc = "es";
        } else if (obj.keySignature.acc === 1) {
            acc = "is";
        }
        lylite.push("\\key " + obj.keySignature.pitch.pitch + acc + " " + obj.keySignature.mode);
    }
}

var createKeySignature = (obj, cursor, stave, idx) => {
    stave.body.splice(idx, 0, {keySignature: cursor.prevKeySignature, _annotated: "createKeySignature"});
    return -1;
};

var getSharpCount = (keySignature) => {
    var k = keySignature.pitch;
    if (keySignature.mode === MAJOR) {
        if (isPitch(k, "c")) {
            return 0;
        } else if (isPitch(k, "g")) {
            return 1;
        } else if (isPitch(k, "d")) {
            return 2;
        } else if (isPitch(k, "a")) {
            return 3;
        } else if (isPitch(k, "e")) {
            return 4;
        } else if (isPitch(k, "b")) {
            return 5;
        } else if (isPitch(k, "f", 1)) {
            return 6;
        } else if (isPitch(k, "c", 1)) {
            return 7;
        }
    } else if (keySignature.mode === MINOR) {
        if (isPitch(k, "a")) {
            return 0;
        } else if (isPitch(k, "e")) {
            return 1;
        } else if (isPitch(k, "b")) {
            return 2;
        } else if (isPitch(k, "f", 1)) {
            return 3;
        } else if (isPitch(k, "c", 1)) {
            return 4;
        } else if (isPitch(k, "g", 1)) {
            return 5;
        } else if (isPitch(k, "d", 1)) {
            return 6;
        } else if (isPitch(k, "a", 1)) {
            return 7;
        }
    } else {
        assert(0, "Not reached");
    }

    return undefined;
};

var getFlatCount = (keySignature) => {
    var k = keySignature.pitch;
    if (keySignature.mode === MAJOR) {
        if (isPitch(k, "f")) {
            return 1;
        } else if (isPitch(k, "b", -1)) {
            return 2;
        } else if (isPitch(k, "e", -1)) {
            return 3;
        } else if (isPitch(k, "a", -1)) {
            return 4;
        } else if (isPitch(k, "d", -1)) {
            return 5;
        } else if (isPitch(k, "g", -1)) {
            return 6;
        } else if (isPitch(k, "c", -1)) {
            return 7;
        }
    } else if (keySignature.mode === MINOR) {
        if (isPitch(k, "d")) {
            return 1;
        } else if (isPitch(k, "g")) {
            return 2;
        } else if (isPitch(k, "c")) {
            return 3;
        } else if (isPitch(k, "f")) {
            return 4;
        } else if (isPitch(k, "b", -1)) {
            return 5;
        } else if (isPitch(k, "e", -1)) {
            return 6;
        } else if (isPitch(k, "a", -1)) {
            return 7;
        }
    } else {
        assert(0, "Not reached");
    }

    return undefined;
};

var getAccidentals = (keySignature) => {
    var ret = {};

    var flats = getFlatCount(keySignature);
    if (flats) {
        _(flats).times(idx => {
            ret[flatCircle[idx]] = -1;
        });
        return ret;
    }

    var sharps = getSharpCount(keySignature);
    _(sharps).times(idx => {
        ret[sharpCircle[idx]] = 1;
    });
    return ret;
};
var flatCircle = "beadgcf";
var sharpCircle = "fcgdaeb";

module.exports = KeySignatureBridge;
module.exports.createKeySignature = createKeySignature;
module.exports.getAccidentals = getAccidentals;
