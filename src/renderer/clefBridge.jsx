/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var Clef = require("./primitives/clef.jsx");

class ClefBridge extends Bridge {
    prereqs() {
        return [
            [
                clefIsNotRedundant,
                (obj, cursor, stave, idx) => {
                    console.log(cursor.clef, obj.clef);
                    stave.body.splice(idx, 1);
                    return -1;
                },
                "A clef must not be redundant."
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
        obj._clef = cursor.clef = (obj.clef === "detect") ? cursor.prevClef : obj.clef;
        var next = this.next(stave, idx);
        if (next.pitch || next.chord) {
            if (next.acc) {
                // TODO: should be 1 if there are more than 1 accidental.
                obj._annotatedSpacing = 1.5;
            } else {
                obj._annotatedSpacing = 2.5;
            }
        } else {
            obj._annotatedSpacing = 1.25;
        }
        cursor.x += 0.6 + obj._annotatedSpacing/4;
        return true;
    }
    render(obj, engine) {
        return <Clef
            key={this.key(obj)}
            stroke={obj.temporary ? "#A5A5A5" : (obj.selected ? "#75A1D0" : "black")}
            x={this.x(obj)} 
            y={this.y(obj)}
            clef={obj._clef} />;
    }
    toLylite(obj, lylite) {
        if (obj["_annotated"]) {
            return;
        }
        lylite.push("\\clef " + obj.clef + "\n");
    }
}

var createClef = (obj, cursor, stave, idx) => {
    stave.body.splice(idx, 0, {
        clef: (cursor.prevClef ? "detect" : "treble"),
        _annotated: "createClef"
    });
    return -1;
};

var clefIsNotRedundant = (obj, cursor) =>
    obj.temporary ||
    cursor.clef !== obj.clef ||
    obj.clef === "detect";

module.exports = ClefBridge;
module.exports.createClef = createClef;
