/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var BeamGroup = require("./primitives/beamGroup.jsx");
var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var PitchBridge = require("./pitchBridge.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");

var beamPitchBridge = new PitchBridge(true);

class BeamGroupBridge extends Bridge {
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
            ],

            [
                (obj, cursor) => obj.beam.length > 1,
                (obj, cursor, stave, idx) => {
                    obj.beam.forEach(o => delete o.inBeam);
                    stave.body.splice(idx, 1);
                    return -1;
                },
                "A beam must have at least two notes"
            ]
        ];
    }
    annotateImpl(obj, cursor, stave, idx) {
        var SongEditorStore = require("../stores/songEditor.jsx");

        var mret = false;
        obj._fontSize = cursor.fontSize;

        var next = this.nextNote(stave, idx);
        obj._tuplet = next && next.tuplet;
        SongEditorStore.beamCountIs(cursor.beats);
        if (!obj.beam.every(b => {
                this.setX(b, cursor.x);
                this.setY(b, cursor.y);
                var ret = beamPitchBridge.annotate(b, cursor, stave, idx);
                mret = ret;
                return (mret === true);
            })) {
                return mret;
        }
        return true;
    }
    render(obj) {
        var Renderer = require("./renderer.jsx");

        var beams = 1;
        if (obj.beam.length) {
            // TODO: variable beams
            beams = PitchBridge.getCount(obj.beam[0])/8;
        }
        return <BeamGroup
                key={this.key(obj)}
                beams={beams}
                generate={() => obj.beam.map(b => beamPitchBridge.render(b))}
                scaleFactor={obj._fontSize*Renderer.FONT_SIZE_FACTOR + "px"}
                tupletsTemporary={obj.tupletsTemporary}
                tuplet={obj._tuplet} />;
    }
    toLylite(obj, lylite, unresolved) {
        var tuplet = obj._tuplet;
        var count = obj.beam.length;
        unresolved.push((obj, lylite, unresolved) => {
            if (!obj.pitch && !obj.chord) {
                return false;
            }

            lylite.push("[");
            return true;
        });
        unresolved.push((obj, lylite, unresolved) => {
            if (!obj.pitch && !obj.chord) {
                return false;
            }

            if (!--count) {
                lylite.push("]");
                return true;
            }
        });

        if (tuplet) {
            lylite.push("\\times " + tuplet.num + "/" + tuplet.den + "{");
            var count2 = count;
            unresolved.push((obj, lylite, unresolved) => {
                if (!obj.pitch && !obj.chord) {
                    return false;
                }
                if (!--count2) {
                    lylite.push("}");
                    return true;
                }
            });
        }

    }
}

var createBeam = (obj, cursor, stave, idx, beam) => {
    stave.body.splice(idx, 0, {beam: beam, _annotated: "createBeam"});
    return -1;
};

module.exports = BeamGroupBridge;
module.exports.createBeam = createBeam;
