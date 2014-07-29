/**
 * @jsx React.DOM
 */

var _ = require("lodash");

var Model = require("./model.jsx");

var ClefModel = require("./clef.jsx");
var KeySignatureModel = require("./keySignature.jsx");
var DurationModel = require("./duration.jsx");
var TimeSignatureModel = require("./timeSignature.jsx");

class BeamGroupModel extends Model {
    annotateImpl(ctx) {
        var SongEditorStore = require("./songEditor.jsx");

        var mret = false;
        this._fontSize = ctx.fontSize;

        var next = ctx.next(obj => obj.pitch || obj.chord);
        this.tuplet = next && next.tuplet;
        SongEditorStore.beamCountIs(ctx.beats);

        this.beams = 1;
        if (this.beam.length) {
            // TODO: variable beams
            this.beams = this.beam[0].count/8;
        }

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
    generate() {
        return _.map(this.beam, b => b.render(true));
    }
    toLylite(lylite, unresolved) {
        var tuplet = this.tuplet;
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
BeamGroupModel.prototype.prereqs = [
    [
        function(ctx) {
            return ctx.clef; },
        ClefModel.createClef,
        "A clef must exist on each line."
    ],

    [
        function(ctx) {
            return ctx.keySignature; },
        KeySignatureModel.createKeySignature,
        "A key signature must exist on each line."
    ],

    [
        function(ctx) {
            return ctx.timeSignature; },
        TimeSignatureModel.createTS,
        "A time signature must exist on the first line of every page."
    ],

    [
        function(ctx) {
            return this.beam.length > 1; },
        function(ctx) {
            _.each(this.beam, o => delete o.inBeam);
            ctx.eraseCurrent();
            return -1;
        },
        "A beam must have at least two notes"
    ]
];

var createBeam = (ctx, beam) => {
    return ctx.insertPast(new BeamGroupModel(
        {beam: beam, _annotated: "createBeam"}));
};

var decideDirection = function(firstLine, lastLine) {
    if (firstLine.length) {
        firstLine = _.reduce(firstLine, (m, s) => m + s, 0)/firstLine.length;
    }
    if (lastLine.length) {
        lastLine = _.reduce(lastLine, (m, s) => m + s, 0)/lastLine.length;
    }
    var avgLine = (firstLine + lastLine)/2;
    if (avgLine >= 3) {
        return -1;
    }

    return 1;
};

module.exports = BeamGroupModel;
module.exports.createBeam = createBeam;
module.exports.decideDirection = decideDirection;
