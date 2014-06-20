/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var TimeSignature = require("../primitives/timeSignature.jsx");

class TimeSignatureBridge extends Bridge {
    annotateImpl(cursor, stave, idx) {
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

        cursor.x += 0.7 + this._annotatedSpacing/4;
        cursor.timeSignature = this.actualTS || this.timeSignature;
        return true;
    }
    render() {
        return <TimeSignature
            key={this.key()}
            stroke={this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black")}
            x={this.x()}
            y={this.y()}
            beats={this.timeSignature.beats}
            beatType={this.timeSignature.beatType}
            commonRepresentation={this.timeSignature.commonRepresentation} />;
    }
    toLylite(lylite) {
        if (this["_annotated"]) {
            return;
        }

        lylite.push("\\time " + this.timeSignature.beats + "/" + this.timeSignature.beatType);
    }
}

var createTS = (cursor, stave, idx) => {
    stave.body.splice(idx, 0, new TimeSignatureBridge({
        timeSignature: {
            beats: 4, 
            beatType: 4,
            commonRepresentation: true
        }, _annotated: "createTS"}));
    return -1;
};

TimeSignatureBridge.prototype.prereqs = [
    [
        function (cursor) {
            return cursor.clef; },
        ClefBridge.createClef,
        "A clef must exist on each line."
    ],

    [
        function (cursor) {
            return cursor.keySignature; },
        KeySignatureBridge.createKeySignature,
        "A key signature must exist on each line."
    ]
];

module.exports = TimeSignatureBridge;
module.exports.createTS = createTS;
