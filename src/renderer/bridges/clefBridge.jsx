/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var Clef = require("../primitives/clef.jsx");

class ClefBridge extends Bridge {
    annotateImpl(cursor, stave, idx) {
        this._clef = cursor.clef = (this.clef === "detect") ? cursor.prevClef : this.clef;
        var next = this.next(stave, idx);
        if (next.pitch || next.chord) {
            if (next.acc) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 1.5;
            } else {
                this._annotatedSpacing = 2.5;
            }
        } else {
            this._annotatedSpacing = 1.25;
        }
        cursor.x += 0.6 + this._annotatedSpacing/4;
        return true;
    }
    render() {
        return <Clef
            key={this.key()}
            stroke={this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black")}
            x={this.x()} 
            y={this.y()}
            clef={this._clef} />;
    }
    toLylite(lylite) {
        if (this["_annotated"]) {
            return;
        }
        lylite.push("\\clef " + this.clef + "\n");
    }
}

var clefIsNotRedundant = function(cursor) {
    return this.temporary ||
        cursor.clef !== this.clef ||
        this.clef === "detect";
};

var createClef = function(cursor, stave, idx) {
    stave.body.splice(idx, 0, new ClefBridge({
        clef: (cursor.prevClef ? "detect" : "treble"),
        _annotated: "createClef"
    }));
    return -1;
};

ClefBridge.prototype.prereqs = [
    [
        clefIsNotRedundant,
        function (cursor, stave, idx) {
            stave.body.splice(idx, 1);
            return -1;
        },
        "A clef must not be redundant."
    ]
];

var standardClefs = [
    {
        name: "treble",
        glyph: "gClef",
        x: -0.4,
        y: 0.4
    }, {
        name: "bass",
        glyph: "fClef",
        x: -0.4,
        y: 0.1
    }, {
        name: "tenor",
        glyph: "cClef",
        x: -0.4,
        y: 0.0
    }, {
        name: "alto",
        glyph: "cClef",
        x: -0.4,
        y: 0.2
    }
];

module.exports = ClefBridge;
module.exports.createClef = createClef;
module.exports.standardClefs = standardClefs;
