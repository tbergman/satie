/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var TimeSignature = require("../primitives/timeSignature.jsx");

class TimeSignatureBridge extends Bridge {
    annotateImpl(ctx) {
        var next = ctx.next();
        if (next.pitch || next.chord) {
            if (next.containsAccidental(ctx)) {
                // TODO: should be 1 if there are more than 1 accidental.
                this._annotatedSpacing = 1.5;
            } else {
                this._annotatedSpacing = 2.5;
            }
        } else {
            this._annotatedSpacing = 1.25;
        }

        ctx.x += 0.7 + this._annotatedSpacing/4;
        ctx.timeSignature = this.actualTS || this.timeSignature;
        return true;
    }
    render() {
        return <TimeSignature
            key={this.key()}
            stroke={this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black")}
            fontSize={this.fontSize()}
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

var createTS = (ctx) => {
    return ctx.insertPast(new TimeSignatureBridge({
        timeSignature: {
            beats: 4, 
            beatType: 4,
            commonRepresentation: true
        }, _annotated: "createTS"}));
};

TimeSignatureBridge.prototype.prereqs = [
    [
        function (ctx) {
            return ctx.clef; },
        ClefBridge.createClef,
        "A clef must exist on each line."
    ],

    [
        function (ctx) {
            return ctx.keySignature; },
        KeySignatureBridge.createKeySignature,
        "A key signature must exist on each line."
    ]
];

module.exports = TimeSignatureBridge;
module.exports.createTS = createTS;
