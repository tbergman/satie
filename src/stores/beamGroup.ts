/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import ReactTS = require("react-typescript");
import _ = require("lodash");

import Model = require("./model");

import C = require("./contracts");
import Annotator = require("./annotator");
import ClefModel = require("./clef");
import DurationModel = require("./duration");
import KeySignatureModel = require("./keySignature");
import TimeSignatureModel = require("./timeSignature");

/*/
 * Model for a beam. Notes that make up a beam are not children of a beam.
 * Rather, they show up directly following a beam. This is somewhat fragile, but
 * makes things like duration spell-checking a bit simpler. Beamed DurationModels
 * are annotated in two passes. They are both annotated in BeamGroupModel and again
 * independently, just as any other model would be.
 */
class BeamGroupModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        if (ctx.prev().type === C.Type.PLACEHOLDER) {
            this.x = ctx.x = ctx.prev().x;
        }
        // A clef must exist on each line.
        if (this.beamCount) {
            this.beam = [];
            for (var i = ctx.idx; i < ctx.body.length && this.beam.length < this.beamCount; ++i) {
                if (ctx.body[i].isNote) {
                    this.beam.push(<DurationModel> ctx.body[i]);
                }
            }
            this.beamCount = undefined;
        }
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

        var mret = C.IterationStatus.RETRY_FROM_ENTRY;

        var next = <BeamGroupModel> ctx.next(obj => obj.isNote);
        this.tuplet = next && next.tuplet || null;
        ctx.songEditor.beamCountIs(ctx.beat);

        var b1 = this.beam[0].count;
        if (_.all(this.beam, b => b.count === b1)) {
            this.beams = Math.round(Math.log(this.beam[0].count) / Math.log(2)) - 2;
        } else {
            this.beams = C.IBeamCount.VARIABLE;
            this.variableBeams = _.map(this.beam,
                b => Math.round(Math.log(b.count) / Math.log(2)) - 2);
        }

        if (!this.beam.every(b => {
            b.x = ctx.x;
            b.y = ctx.y;
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

    constructor(spec: any) {
        super(spec);
    }

    /**
     * Renders the beam
     */
    generate(fontSize: number): Array<ReactTS.ReactComponentBase<any, any>> {
        return <any> _.map(this.beam, b => b.render(fontSize));
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

    getBeats(ctx: Annotator.Context) {
        return this.beam[0].getBeats(ctx);
    }

    static createBeam = (ctx: Annotator.Context, beam: Array<DurationModel>) => {
        return ctx.insertPast(new BeamGroupModel(
            {beam: beam, source: C.Source.ANNOTATOR}));
    };

    static decideDirection = function(firstLines: Array<number>, lastLines: Array<number>) {
        var firstAvgLine: number;
        var lastAvgLine: number;

        firstAvgLine = _.reduce(firstLines, (m: number, s: number) => m + s, 0) /
            firstLines.length;
        lastAvgLine = _.reduce(lastLines, (m: number, s: number) => m + s, 0) /
            lastLines.length;
        var avgLine = (firstAvgLine + lastAvgLine)/2;
        if (avgLine >= 3) {
            return -1;
        }

        return 1;
    };

    get type() {
        return C.Type.BEAM_GROUP;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            beamCount: this.beamCount || this.beam.length,
            beams: this.beams,
            variableBeams: this.variableBeams,
            tuplet: this.tuplet || null,
            tupletsTemporary: this.tupletsTemporary
        });
    }

    /**
     * Notes in the beam
     */
    beam: Array<DurationModel>;

    /**
     * The number of lines in the beam (1-9), or VARIABLE.
     */
    beams: C.IBeamCount;

    /**
     * The beam counts if beams is VARIABLE.
     */
    variableBeams: Array<number>;

    tuplet: any = null;
    tupletsTemporary: boolean;

    /**
     * Temporary variable used when reading in from JSON.
     */
    beamCount: number;
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = BeamGroupModel;
