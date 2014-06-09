/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var BeamGroup = require("../primitives/beamGroup.jsx");
var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var PitchBridge = require("./pitchBridge.jsx");
var Slur = require("../primitives/slur.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");

class SlurGroupBridge extends Bridge {
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
            ],

            [
                (obj, cursor) => cursor.timeSignature,
                TimeSignatureBridge.createTS,
                "A time signature must exist on the first line of every page."
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
        var n = [];
        obj._beam = undefined;
        obj._fontSize = cursor.fontSize;
        for (var i = idx; i < stave.body.length && n.length < obj.slur; ++i) {
            if (stave.body[i].beam) {
                obj._beam = stave.body[i];
            }
            if (stave.body[i].pitch || stave.body[i].chord) {
                n.push(stave.body[i]);
            }
        }
        obj._notes = n;
        return true;
    }
    render(obj) {
        var Renderer = require("./renderer.jsx");

        if (!obj._notes.length) {
            return <g key={this.key(obj) + "_EMPTY"} />;
        }
        var first = obj._notes[0];
        var last = obj._notes[obj._notes.length - 1];
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
                key={this.key(obj)}
                scaleFactor={obj._fontSize*Renderer.FONT_SIZE_FACTOR + "px"}>
        </Slur>;
    }
    toLylite(obj, lylite, unresolved) {
        var count = obj.slur;
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

module.exports = SlurGroupBridge;
