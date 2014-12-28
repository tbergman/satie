/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model                = require("./model");

import React            	= require("react");
import _                	= require("lodash");
import assert           	= require("assert");

import C                	= require("./contracts");
import Annotator        	= require("./annotator");
import ClefModel        	= require("./clef");
import Duration         	= require("../views/duration");
import DurationModel    	= require("./duration");
import KeySignatureModel    = require("./keySignature");
import TimeSignatureModel   = require("./timeSignature");

/**
 * Model for a beam. Notes that make up a beam are not children of a beam.
 * Rather, they show up directly following a beam. This is somewhat fragile, but
 * makes things like duration spell-checking a bit simpler. Beamed DurationModels
 * are annotated in two passes. They are both annotated in BeamGroupModel and again
 * independently, just as any other model would be.
 */
class BeamGroupModel extends Model {
    ///////////////
    // I.1 Model //
    ///////////////

    get type()                          { return C.Type.BeamGroup; }
    get xPolicy()                   	{ return C.RectifyXPolicy.Min; }
    get fields() { return ["beamCount", "variableBeams"]; }

    ////////////////////////
    // I.2 BeamGroupModel //
    ////////////////////////

    get beamCount()                     { return this.beam ? this.beam.length : 0; }
    set beamCount(l: number) {
        if (!this.beam) {
            this.beam = [];
        }
        this.beam.length = l;
    }

    /** Pointers to notes in the beam */
    beam:               DurationModel[];

    /** The number of lines in the beam (1-9), or Variable. */
    beams:              C.BeamCount;

    /** The beam counts if beams is VARIABLE.  */
    variableBeams:      number[];

    tuplet:             C.ITuplet       // See BeamGroupModel.prototype.tuplet.
    tupletsTemporary:   boolean;

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    constructor(spec: any, placeholder: boolean) {
        super(spec, placeholder);
        if (spec.beam) {
            this.beam = spec.beam;
        }
    }

    modelDidLoad(body: Array<Model>, idx: number) {
        var beamCount       = this.beamCount;
        var toMark          = beamCount;
        var gotTuplet       = false;

        for (var i = idx; toMark; ++i) {
            assert(body[i]);
            if (body[i].isNote) {
                this.tuplet = gotTuplet ? C.JSONx.clone(body[i].note.tuplet) : this.tuplet;
                gotTuplet   = true;
                --toMark;
            }
        }

        this.beam = [];
        for (var i = idx; i < body.length && this.beam.length < beamCount; ++i) {
            if (body[i].isNote) {
                this.beam.push(<DurationModel> body[i]);
            }
        }
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // A clef must exist on each line.
        if (!ctx.attributes.clef) {
            return ClefModel.createClef(ctx);
        }

        // A key signature must exist on each line.
        if (!ctx.attributes.keySignature) {
            return KeySignatureModel.createKeySignature(ctx);
        }

        // A time signature must exist on the first line of every page.
        if (!ctx.ts) {
            return TimeSignatureModel.createTS(ctx);
        }

        // A beam must not cross a bar (for now)
        var beats = 0;
        for (var i = 0; i < this.beam.length; ++i) {
            beats += this.beam[i].calcBeats(ctx);
        }
        if (ctx.beat + beats > ctx.ts.beats) {
            _.each(this.beam, o => { o.inBeam = false; });
            ctx.eraseCurrent();
            return C.IterationStatus.RetryCurrent;
        }

        // A beam must have at least two notes.
        if (this.beam.length < 2) {
            _.each(this.beam, o => { o.inBeam = false; });
            ctx.eraseCurrent();
            return C.IterationStatus.RetryCurrent;
        }

        // A beam must not have unbeamable notes
        for (var i = 0; i < this.beam.length; ++i) {
            if (!this.beam[i].temporary && !this.beam[i].isRest && !this.beam[i].hasFlagOrBeam) {
                _.each(this.beam, o => { o.inBeam = false; });
                ctx.eraseCurrent();
                return C.IterationStatus.RetryCurrent;
            }
        }

        var mret                = C.IterationStatus.RetryFromEntry;

        var next            	= ctx.next(obj => obj.isNote).note;
        this.tuplet         	= next ? next.displayTuplet : null;
        ctx.startOfBeamBeat 	= ctx.beat;

        var b1 = this.beam[0].count;
        if (_.all(this.beam, b => b.count === b1)) {
            this.beams          = Math.round(Math.log(this.beam[0].count) / Math.log(2)) - 2;
        } else {
            this.beams      	= C.BeamCount.Variable;
            this.variableBeams  = _.map(this.beam, toBeamCount);

            function toBeamCount(b: DurationModel) {
                return Math.round(Math.log(b.count) / Math.log(2)) - 2;
            }
        }

        if (!this.beam.every(b => {
                b.x             = ctx.x;
        	    b.y             = ctx.y;
        	    var cidx        = this.idx;

        	    while(ctx.body[cidx] !== b) {
        	        cidx        = cidx + 1;
        	    }

        	    var oldIdx      = ctx.idx;
        	    ctx.isBeam      = true;
        	    ctx.idx         = cidx;
        	    var ret         = b.annotate(ctx);
        	    ctx.idx         = oldIdx;
        	    ctx.isBeam      = undefined;
        	    mret            = ret;

        	    return (mret === C.IterationStatus.Success);
        	})) {

            return mret;
        }
        ctx.x                   = this.x;
        return C.IterationStatus.Success;
    }

    /**
     * Renders the beam. See also Model.generate.
     */
    generate(options: Array<Duration.IProps>): Array<React.ReactElement<any>> {
        return <any> _.map(this.beam, (b, idx) => b.render(options[idx]));
    }

    ///////////////
    // III. Util //
    ///////////////

    calcBeats(ctx: C.MetreContext, inheritedCount?: number, force?: boolean) {
        var sum = 0;
        for (var i = 0; i < this.beam.length; ++i) {
            sum += this.beam[i].calcBeats(ctx, inheritedCount, force);
        }
        return sum;
    }

    ////////////////
    // IV. Static //
    ////////////////

    static createBeam = (ctx: Annotator.Context, beam: Array<DurationModel>) => {
        var replaceMode         = ctx.body[ctx.idx - 1].placeholder && ctx.body[ctx.idx - 1].priority === C.Type.BeamGroup;
        var model               = new BeamGroupModel({ beam: beam }, true);
        var offset              = replaceMode ? 1 : 0;
        var idx                 = ctx.idx - offset;
        var spliceMode          = replaceMode ? Annotator.SplicePolicy.Masked : Annotator.SplicePolicy.MatchedOnly;

        model.tuplet            = model.beam[0].tuplet;
        ctx.splice(idx, offset, [model], spliceMode);

        return C.IterationStatus.RetryFromEntry;
    };

    static decideDirection = function(firstLines: Array<number>, lastLines: Array<number>) {
        var firstAvgLine: number;
        var lastAvgLine: number;

        firstAvgLine    = _.reduce(firstLines, (m: number, s: number) => m + s, 0) / firstLines.length;
        lastAvgLine     = _.reduce(lastLines,  (m: number, s: number) => m + s, 0) / lastLines.length;
        var avgLine     = (firstAvgLine + lastAvgLine)/2;

        return avgLine >= 3 ? -1 : 1;
    };
}

BeamGroupModel.prototype.tuplet = null;

export = BeamGroupModel;
