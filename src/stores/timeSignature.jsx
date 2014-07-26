/**
 * @jsx React.DOM
 */

var Model = require("./model.jsx");

var _ = require("lodash");

var ClefModel = require("./clef.jsx");
var KeySignatureModel = require("./keySignature.jsx");

class TimeSignatureModel extends Model {
    annotateImpl(ctx) {
        var next = ctx.next();
        if (next.pitch || next.chord) {
            if (_.any(_.filter(next.intersects, l => l.isNote()),
                           n => n.containsAccidental(ctx)) ? 1 : 0) {
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
        this.color = this.temporary ? "#A5A5A5" : (this.selected ? "#75A1D0" : "black");
        return true;
    }
    toLylite(lylite) {
        if (this["_annotated"]) {
            return;
        }

        lylite.push("\\time " + this.timeSignature.beats + "/" + this.timeSignature.beatType);
    }
}

var createTS = (ctx) => {
    return ctx.insertPast(new TimeSignatureModel({
        timeSignature: {
            beats: 4, 
            beatType: 4,
            commonRepresentation: true
        }, _annotated: "createTS"}));
};

TimeSignatureModel.prototype.prereqs = [
    [
        function (ctx) {
            return ctx.clef; },
        ClefModel.createClef,
        "A clef must exist on each line."
    ],

    [
        function (ctx) {
            return ctx.keySignature; },
        KeySignatureModel.createKeySignature,
        "A key signature must exist on each line."
    ]
];

module.exports = TimeSignatureModel;
module.exports.createTS = createTS;
