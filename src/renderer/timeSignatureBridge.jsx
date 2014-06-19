/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var TimeSignature = require("./primitives/timeSignature.jsx");

class TimeSignatureBridge extends Bridge {
    prereqs() {
        return [
            [
                (obj, cursor) => cursor.clef,
                ClefBridge.createClef,
                "A clef must exist on each line."
            ],

            [
                (obj, cursor) => cursor.keySignature,
                KeySignatureBridge.createKeySignature,
                "A key signature must exist on each line."
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
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

        cursor.x += 0.7 + obj._annotatedSpacing/4;
        cursor.timeSignature = obj.actualTS || obj.timeSignature;
        return true;
    }
    render(obj) {
        return <TimeSignature
            key={this.key(obj)}
            stroke={obj.temporary ? "#A5A5A5" : (obj.selected ? "#75A1D0" : "black")}
            x={this.x(obj)}
            y={this.y(obj)}
            beats={obj.timeSignature.beats}
            beatType={obj.timeSignature.beatType}
            commonRepresentation={obj.timeSignature.commonRepresentation} />;
    }
    toLylite(obj, lylite) {
        if (obj["_annotated"]) {
            return;
        }

        lylite.push("\\time " + obj.timeSignature.beats + "/" + obj.timeSignature.beatType);
    }
}

var createTS = (obj, cursor, stave, idx) => {
    stave.body.splice(idx, 0, {
        timeSignature: {
            beats: 4, 
            beatType: 4,
            commonRepresentation: true
        }, _annotated: "createTS"});
    return -1;
};

module.exports = TimeSignatureBridge;
module.exports.createTS = createTS;
