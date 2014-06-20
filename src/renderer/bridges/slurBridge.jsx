/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var BeamGroup = require("../primitives/beamGroup.jsx");
var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var PitchBridge = require("./pitchBridge.jsx");
var Slur = require("./primitives/slur.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");

class SlurGroupBridge extends Bridge {
    annotateImpl(cursor, stave, idx) {
        var n = [];
        this._beam = undefined;
        this._fontSize = cursor.fontSize;
        for (var i = idx; i < stave.body.length && n.length < this.slur; ++i) {
            if (stave.body[i].beam) {
                this._beam = stave.body[i];
            }
            if (stave.body[i].pitch || stave.body[i].chord) {
                n.push(stave.body[i]);
            }
        }
        this._notes = n;
        return true;
    }
    render() {
        var Renderer = require("./renderer.jsx");

        if (!this._notes.length) {
            return <g key={this.key() + "_EMPTY"} />;
        }
        var first = this._notes[0];
        var last = this._notes[this._notes.length - 1];
        return <Slur
                direction={-BeamGroup.decideDirection(
                        PitchBridge.getLine(first),
                        PitchBridge.getLine(last)
                    )}
                x={this.x(first)}
                y={this.y(first)}
                line1={PitchBridge.getLine(first)}
                line2={PitchBridge.getLine(last)}
                width={this.x(last) - this.x(first)}
                key={this.key()}
                scaleFactor={this._fontSize*Renderer.FONT_SIZE_FACTOR + "px"}>
        </Slur>;
    }
    toLylite(lylite, unresolved) {
        var count = this.slur;
        unresolved.push((obj, lylite, unresolved) => {
            if (!obj.pitch && !obj.chord) {
                return false;
            }

            lylite.push("(");
            return true;
        });
        unresolved.push((obj, lylite, unresolved) => {
            if (!obj.pitch && !obj.chord) {
                return false;
            }

            if (!--count) {
                lylite.push(")");
                return true;
            }
        });
    }
}

SlurGroupBridge.prototype.prereqs = [
    [
        function(cursor) { return cursor.clef; },
        ClefBridge.createClef,
        "A clef must exist on each line."
    ],

    [
        function(cursor) { return cursor.keySignature; },
        KeySignatureBridge.createKeySignature,
        "A key signature must exist on each line."
    ],

    [
        function(cursor) { return cursor.timeSignature; },
        TimeSignatureBridge.createTS,
        "A time signature must exist on the first line of every page."
    ]
];

module.exports = SlurGroupBridge;
