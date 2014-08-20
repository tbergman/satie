/**
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");
import _ = require("lodash");

import Model = require("./model");

import C = require("./contracts");
import Context = require("./context");
import ClefModel = require("./clef");
import KeySignatureModel = require("./keySignature");
import DurationModel = require("./duration");
import TimeSignatureModel = require("./timeSignature");

class BeamGroupModel extends Model {
    tuplet: any;
    tupletsTemporary: boolean;
    beams: number;
    beam: Array<DurationModel>;

    annotateImpl(ctx: Context): C.IterationStatus {
        // A clef must exist on each line.
        if (!ctx.clef) {
            return ClefModel.createClef(ctx);
        }

        // A key signature must exist on each line.
        if (!ctx.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }

        // A time signature must exist on the first line of every page.
        if (!ctx.timeSignature) {
            return TimeSignatureModel.createTS(ctx);
        }

        // A beam must have at least two notes.
        if (this.beam.length < 2) {
            _.each(this.beam, o => o.inBeam = false);
            ctx.eraseCurrent();
            return C.IterationStatus.RETRY_CURRENT;
        }

        var mret = C.IterationStatus.RETRY_ENTIRE_DOCUMENT;

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
            return (mret === C.IterationStatus.SUCCESS);
        })) {
            return mret;
        }
        return C.IterationStatus.SUCCESS;
    }
    generate(): Array<ReactTS.ReactComponentBase<any, any>> {
        return <any> _.map(this.beam, b => b.render());
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
    getBeats(ctx: Context) {
        return this.beam[0].getBeats(ctx);
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

    get type() {
        return C.Type.BEAM_GROUP;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = BeamGroupModel;
