/**
 * @jsx React.DOM
 */

import _ = require("lodash");

import Model = require("./model");

import ClefModel = require("./clef");
import KeySignatureModel = require("./keySignature");
import DurationModel = require("./duration");
import TimeSignatureModel = require("./timeSignature");

class BeamGroupModel extends Model {
    tuplet: any;
    beams: number;
    beam: Array<DurationModel>;

    annotateImpl(ctx) {
        var mret = false;
        this._fontSize = ctx.fontSize;

        var next = ctx.next(obj => obj.pitch || obj.chord);
        this.tuplet = next && next.tuplet;
        var SongEditorStore = require("./songEditor"); // Recursive dependency.
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
        return _.map(this.beam, b => b.render());
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
    static createBeam = (ctx, beam) => {
        return ctx.insertPast(new BeamGroupModel(
            {beam: beam, _annotated: "createBeam"}));
    };

    static decideDirection = function(firstLine: any, lastLine: any) {
        var firstAvgLine: number;
        var lastAvgLine: number;

        if (firstLine.length) {
            firstAvgLine = _.reduce(firstLine, (m: number, s) => m + s, 0) / firstLine.length;
        } else {
            firstAvgLine = firstLine;
        }
        if (lastLine.length) {
            lastAvgLine = _.reduce(lastLine, (m: number, s) => m + s, 0) / lastLine.length;
        } else {
            lastAvgLine = lastLine;
        }
        var avgLine = (firstAvgLine + lastAvgLine)/2;
        if (avgLine >= 3) {
            return -1;
        }

        return 1;
    };

    prereqs = BeamGroupModel.prereqs;
    static prereqs = [
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
            function (ctx) {
                debugger;
                var self: BeamGroupModel = this;
                _.each(self.beam, o => o.inBeam = false);
                ctx.eraseCurrent();
                return -1;
            },
            "A beam must have at least two notes"
        ]
    ];

}

Model.length; // BUG in typescriptifier

export = BeamGroupModel;
