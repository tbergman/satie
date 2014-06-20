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
    annotateImpl(cursor, stave, idx) {
        this._clef = cursor.clef;
        var next = this.next(stave, idx);
        if (next.pitch || next.chord) {
            if (next.acc) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 2.5;
            } else {
                this._annotatedSpacing = 1.5;
            }
        } else {
            this._annotatedSpacing = 1;
        }
        var c = getSharpCount(this.keySignature) || getFlatCount(this.keySignature);
        if (c) {
            cursor.x += this._annotatedSpacing/4 + 0.4*c;
        }
        cursor.keySignature = this.keySignature;
        cursor.accidentals = getAccidentals(cursor.keySignature);
        return true;
    }
    render() {
        return <KeySignature
            key={this.key()}
            stroke={this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black")}
            x={this.x()}
            y={this.y()}
            clef={this._clef}
            sharpCount={getSharpCount(this.keySignature)}
            flatCount={getFlatCount(this.keySignature)} />;
    }
    toLylite(lylite) {
        if (this["_annotated"]) {
            return;
        }

        var acc = "";
        if (this.keySignature.acc === -1) {
            acc = "es";
        } else if (this.keySignature.acc === 1) {
            acc = "is";
        }
        lylite.push("\\key " + this.keySignature.pitch.pitch + acc + " " + this.keySignature.mode);
    }
}

KeySignatureBridge.prototype.prereqs = [
    [
        function (cursor) {
            return cursor.clef; },
        ClefBridge.createClef,
        "A clef must exist on each line."
    ]
];

var createKeySignature = (cursor, stave, idx) => {
    stave.body.splice(idx, 0, new KeySignatureBridge ({
        keySignature: cursor.prevKeySignature,
        _annotated: "createKeySignature"
    }));
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
