/**
 * @jsx React.DOM
 */

import _ = require("lodash");

import Model = require("./model");

import Context = require("./context");
import Contracts = require("./contracts");
import ClefModel = require("./clef");
import IterationStatus = require("./iterationStatus");
import KeySignatureModel = require("./keySignature");
import DurationModel = require("./duration");
import SmartCondition = require("./smartCondition");
import TimeSignatureModel = require("./timeSignature");

class BeamGroupModel extends Model {
    tuplet: any;
    tupletsTemporary: boolean;
    beams: number;
    beam: Array<DurationModel>;

    annotateImpl(ctx: Context): IterationStatus {
        var mret = IterationStatus.RETRY_ENTIRE_DOCUMENT;
        this._fontSize = ctx.fontSize;

        var next = <BeamGroupModel> ctx.next(obj => obj.isNote);
        this.tuplet = next && next.tuplet;
        var SongEditorStore = require("./songEditor"); // Recursive dependency.
        SongEditorStore.beamCountIs(ctx.beats);

        this.beams = 1;
        if (this.beam.length) {
            // TODO: variable beams
            this.beams = this.beam[0].count / 8;
        }

        if (!this.beam.every(b => {
            b.setX(ctx.x);
            b.setY(ctx.y);
            ctx.isBeam = true;
            var ret = b.annotate(ctx);
            ctx.isBeam = undefined;
            mret = ret;
            return (mret === IterationStatus.SUCCESS);
        })) {
            return mret;
        }
        return IterationStatus.SUCCESS;
    }
    generate() {
        return _.map(this.beam, b => b.render());
    }
    toLylite(lylite: Array<string>, unresolved?: Array<(obj: Model) => boolean>) {
        var tuplet = this.tuplet;
        var count = this.beam.length;
        unresolved.push((obj) => {
            if (!obj.isNote) {
                return false;
            }

            lylite.push("[");
            return true;
        });
        unresolved.push((obj) => {
            if (!obj.isNote) {
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
            unresolved.push((obj) => {
                if (!obj.isNote) {
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
    static createBeam = (ctx: Context, beam: Array<DurationModel>) => {
        return ctx.insertPast(new BeamGroupModel(
            {beam: beam, _annotated: "createBeam"}));
    };

    static decideDirection = function(firstLine: any, lastLine: any) {
        var firstAvgLine: number;
        var lastAvgLine: number;

        if (firstLine.length) {
            firstAvgLine = _.reduce(firstLine, (m: number, s: number) => m + s, 0) /
                firstLine.length;
        } else {
            firstAvgLine = firstLine;
        }
        if (lastLine.length) {
            lastAvgLine = _.reduce(lastLine, (m: number, s: number) => m + s, 0) /
                lastLine.length;
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
    static prereqs: Array<SmartCondition> = [
        {
            condition: function (ctx) {
                return !!ctx.clef;
            },
            correction: ClefModel.createClef,
            description: "A clef must exist on each line."
        },

        {
            condition: function (ctx) {
                return !!ctx.keySignature;
            },
            correction: KeySignatureModel.createKeySignature,
            description: "A key signature must exist on each line."
        },

        {
            condition: function (ctx) {
                return !!ctx.timeSignature;
            },
            correction: TimeSignatureModel.createTS,
            description: "A time signature must exist on the first line of every page."
        },

        {
            condition: function(ctx) {
                return this.beam.length > 1; },
            correction: function (ctx) {
                var self: BeamGroupModel = this;
                _.each(self.beam, o => o.inBeam = false);
                ctx.eraseCurrent();
                return IterationStatus.RETRY_CURRENT;
            },
            description: "A beam must have at least two notes"
        }
    ];

    get type() {
        return Contracts.ModelType.BEAM_GROUP;
    }
}

Model.length; // BUG in typescriptifier

export = BeamGroupModel;
