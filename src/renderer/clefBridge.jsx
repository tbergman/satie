/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var Clef = require("../primitives/clef.jsx");
var unittest = require("../unittest.jsx");

class ClefBridge extends Bridge {
    prereqs() {
        return [];
    }
    annotateImpl(obj, cursor, stave, idx) {
        cursor.clef = obj.clef;
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
    render(obj) {
        return <Clef
            key={this.key(obj)}
            stroke={obj.temporary ? "#A5A5A5" : (obj.selected ? "#75A1D0" : "black")}
            x={this.x(obj)} 
            y={this.y(obj)}
            clef={obj.clef} />;
    }
    toLylite(obj, lylite) {
        if (obj["_annotated"]) {
            return;
        }
        lylite.push("\\clef " + obj.clef + "\n");
    }
}

var createClef = (obj, cursor, stave, idx) => {
    stave.body.splice(idx, 0, {clef: (cursor.prevClef || "treble"), _annotated: "createClef"});
    return -1;
};

unittest(() => {
    // Clef changes are 2/3 regular size.
});

module.exports = ClefBridge;
module.exports.createClef = createClef;
