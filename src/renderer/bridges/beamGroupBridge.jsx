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
    annotateImpl(ctx) {
        var SongEditorStore = require("../../stores/songEditor.jsx");

        var mret = false;
        this._fontSize = ctx.fontSize;

        var next = ctx.next(obj => obj.pitch || obj.chord);
        this._tuplet = next && next.tuplet;
        SongEditorStore.beamCountIs(ctx.beats);
        if (!this.beam.every(b => {
                b.setX(ctx.x);
                b.setY(ctx.y);
                ctx.isBeam = true;
                var ret = b.annotate(ctx);
                ctx.isBeam = undefined;
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
    getBeats() {
        return this.beam[0].getBeats();
    }
}
BeamGroupBridge.prototype.prereqs = [
    [
        function(ctx) {
            return ctx.clef; },
        ClefBridge.createClef,
        "A clef must exist on each line."
    ],

    [
        function(ctx) {
            return ctx.keySignature; },
        KeySignatureBridge.createKeySignature,
        "A key signature must exist on each line."
    ],

    [
        function(ctx) {
            return ctx.timeSignature; },
        TimeSignatureBridge.createTS,
        "A time signature must exist on the first line of every page."
    ],

    [
        function(ctx) {
            return this.beam.length > 1; },
        function(ctx) {
            this.beam.forEach(o => delete o.inBeam);
            ctx.body.splice(ctx.idx, 1);
            return -1;
        },
        "A beam must have at least two notes"
    ]
];

var createBeam = (ctx, beam) => {
    ctx.body.splice(ctx.idx, 0, new BeamGroupBridge(
        {beam: beam, _annotated: "createBeam"}));
    return -1;
};

module.exports = BeamGroupBridge;
module.exports.createBeam = createBeam;
