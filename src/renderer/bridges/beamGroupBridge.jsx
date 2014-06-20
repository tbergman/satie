/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var BeamGroup = require("../primitives/beamGroup.jsx");
var ClefBridge = require("./clefBridge.jsx");
var KeySignatureBridge = require("./keySignatureBridge.jsx");
var PitchBridge = require("./pitchBridge.jsx");
var TimeSignatureBridge = require("./timeSignatureBridge.jsx");

var beamPitchBridge = new PitchBridge(true);

class BeamGroupBridge extends Bridge {
    annotateImpl(cursor, stave, idx) {
        var SongEditorStore = require("../../stores/songEditor.jsx");

        var mret = false;
        this._fontSize = cursor.fontSize;

        var next = this.nextNote(stave, idx);
        this._tuplet = next && next.tuplet;
        SongEditorStore.beamCountIs(cursor.beats);
        if (!this.beam.every(b => {
                b.setX(cursor.x);
                b.setY(cursor.y);
                cursor.isBeam = true;
                var ret = b.annotate(cursor, stave, idx, true);
                cursor.isBeam = undefined;
                mret = ret;
                return (mret === true);
            })) {
                return mret;
        }
        return true;
    }
    render() {
        var Renderer = require("../renderer.jsx");

        var beams = 1;
        if (this.beam.length) {
            // TODO: variable beams
            beams = PitchBridge.getCount(this.beam[0])/8;
        }
        return <BeamGroup
                key={this.key()}
                beams={beams}
                generate={() => this.beam.map(b => b.render(true))}
                scaleFactor={this._fontSize*Renderer.FONT_SIZE_FACTOR + "px"}
                tupletsTemporary={this.tupletsTemporary}
                tuplet={this._tuplet} />;
    }
    toLylite(lylite, unresolved) {
        var tuplet = this._tuplet;
        var count = this.beam.length;
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
BeamGroupBridge.prototype.prereqs = [
    [
        function(cursor) {
            return cursor.clef; },
        ClefBridge.createClef,
        "A clef must exist on each line."
    ],

    [
        function(cursor) {
            return cursor.keySignature; },
        KeySignatureBridge.createKeySignature,
        "A key signature must exist on each line."
    ],

    [
        function(cursor) {
            return cursor.timeSignature; },
        TimeSignatureBridge.createTS,
        "A time signature must exist on the first line of every page."
    ],

    [
        function(cursor) {
            return this.beam.length > 1; },
        function(cursor, stave, idx) {
            this.beam.forEach(o => delete o.inBeam);
            stave.body.splice(idx, 1);
            return -1;
        },
        "A beam must have at least two notes"
    ]
];

var createBeam = (cursor, stave, idx, beam) => {
    stave.body.splice(idx, 0, new BeamGroupBridge(
        {beam: beam, _annotated: "createBeam"}));
    return -1;
};

module.exports = BeamGroupBridge;
module.exports.createBeam = createBeam;
