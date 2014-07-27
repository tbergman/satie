/**
 * @jsx React.DOM
 */

var Model = require("./model.jsx");

var _ = require("lodash");
var assert = require("assert");

var ClefModel = require("./clef.jsx");

var MAJOR = "\\major";
var MINOR = "\\minor";

var isPitch = (k, name, acc) =>
    k.pitch === name && (k.acc || 0) === (acc || 0);

class KeySignatureModel extends Model {
    annotateImpl(ctx) {
        this.clef = ctx.clef;
        var next = ctx.next();
        ctx.keySignature = this.keySignature;
        ctx.accidentals = getAccidentals(ctx.keySignature);
        if (next.pitch || next.chord) {
            if (_.any(_.filter(next.intersects, l => l.isNote()),
                           n => n.containsAccidental(ctx)) ? 1 : 0) {
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
            ctx.x += this._annotatedSpacing/4 + 0.26*c;
        }
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        return true;
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
    getSharpCount() {
        return getSharpCount(this.keySignature);
    }
    getFlatCount() {
        return getFlatCount(this.keySignature);
    }
}

KeySignatureModel.prototype.prereqs = [
    [
        function (ctx) {
            return ctx.clef; },
        ClefModel.createClef,
        "A clef must exist on each line."
    ]
];

var createKeySignature = (ctx) => {
    return ctx.insertPast(new KeySignatureModel({
        keySignature: ctx.prevKeySignature ||
            {pitch: {pitch: "c"}, acc: 0, mode: MAJOR},
        _annotated: "createKeySignature"
    }));
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
        } else if (isPitch(k, "g", 1)) {
            return 7; // + fx
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
        } else if (isPitch(k, "e", 1)) {
            return 7; // + fx
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
        } else if (isPitch(k, "f", -1)) {
            return 7; // + bbb
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
        } else if (isPitch(k, "d", -1)) {
            return 7; // + bbb
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
        _.times(flats, idx => {
            ret[flatCircle[idx]] = -1;
        });
        return ret;
    }

    var sharps = getSharpCount(keySignature);
    _.times(sharps, idx => {
        ret[sharpCircle[idx]] = 1;
    });
    return ret;
};
var flatCircle = "beadgcf";
var sharpCircle = "fcgdaeb";

module.exports = KeySignatureModel;
module.exports.createKeySignature = createKeySignature;
module.exports.getAccidentals = getAccidentals;