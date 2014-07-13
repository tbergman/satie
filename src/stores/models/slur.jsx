/**
 * @jsx React.DOM
 */

var Model = require("./model.jsx");

var BeamGroupModel = require("./beamGroup.jsx");
var ClefModel = require("./clef.jsx");
var KeySignatureModel = require("./keySignature.jsx");
var DurationModel = require("./duration.jsx");
var TimeSignatureModel = require("./timeSignature.jsx");

class SlurGroupModel extends Model {
    annotateImpl(ctx) {
        var n = [];
        this._beam = undefined;
        this._fontSize = ctx.fontSize;
        for (var i = ctx.idx; i < ctx.body.length && n.length < this.slur; ++i) {
            if (ctx.body[i].beam) {
                this._beam = ctx.body[i];
            }
            if (ctx.body[i].pitch || ctx.body[i].chord) {
                n.push(ctx.body[i]);
            }
        }
        this._notes = n;
        this.isEmpty = !n.length;
        if (!this.isEmpty) {
            var first = this._notes[0];
            var last = this._notes[this._notes.length - 1];
            this.direction = - BeamGroupModel.decideDirection(
                DurationModel.getLine(first),
                DurationModel.getLine(last));
            this.x = first.x();
            this.y = first.y();
            this.line1 = DurationModel.getLine(first);
            this.line2 = DurationModel.getLine(last);
            this.width = last.x() - first.x();
        }
        return true;
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

SlurGroupModel.prototype.prereqs = [
    [
        function(ctx) { return ctx.clef; },
        ClefModel.createClef,
        "A clef must exist on each line."
    ],

    [
        function(ctx) { return ctx.keySignature; },
        KeySignatureModel.createKeySignature,
        "A key signature must exist on each line."
    ],

    [
        function(ctx) { return ctx.timeSignature; },
        TimeSignatureModel.createTS,
        "A time signature must exist on the first line of every page."
    ]
];

module.exports = SlurGroupModel;
