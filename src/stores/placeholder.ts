/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, September 2014
 */

import Model                = require("./model");

import _                	= require("lodash");
import assert           	= require("assert");

import Annotator        	= require("./annotator");
import BarlineModel     	= require("./barline");
import BeginModel       	= require("./begin");
import C                	= require("./contracts");
import ClefModel        	= require("./clef");
import DurationModel    	= require("./duration");
import EndMarkerModel   	= require("./endMarker");
import KeySignatureModel    = require("./keySignature");
import Metre                = require("./metre");
import NewlineModel         = require("./newline");
import NewpageModel         = require("./newpage");
import TimeSignatureModel   = require("./timeSignature");

/**
 * Models in the same location across voices must have:
 *  - the same priority (=== type, except in PlaceholderModel)
 *  - the same starting beat
 *
 * PlaceholderModels fill gaps in voices to make these conditions true.
 *
 * PlaceholderModels are used when there is no information at the current position in the current
 * voice. For example, consider this bar:
 * 
 *   Beat:     [1///2///3///4///]
 *   Voice 1:  [|#######|######|]
 *   Voice 2:  [|##############|]
 * 
 * On beat 3, Voice 2 would have a placeholder for a Duration, because it does not have a starting
 * not on beat 3.
 */
class PlaceholderModel extends Model {
    ///////////////
    // I.1 Model //
    ///////////////

    get visible()                                       { return false; }
    get xPolicy()                                       { return C.RectifyXPolicy.Invalid; }
    get fields()                                        { return ["priority",
                                                                  "item" /* For Renderer */,
                                                                  "musicLine" /* ditto */]; }
    get type():             C.Type                      { return C.Type.Placeholder; }
    get placeholder()                                   { return true; }
    set placeholder(b: boolean) {
        assert(false, "A PlaceholderModel cannot help but be a placeholder, however much it tries...");
    }

    //////////////////////////
    // I.2 PlaceholderModel //
    //////////////////////////

    _priority:              C.Type;                     // See Object.prototype._priority
    get priority()                                      { return this._priority; }
    set priority(c: C.Type)                             { this._priority = c; }

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    constructor(spec: {priority: number}, annotated: boolean) {
        super(spec, annotated);
        this.annotated = annotated;
    }

    recordMetreDataImpl(mctx: C.MetreContext) {
        // EXCEPTION -- if we are a DurationModel at beat 0, we actually should be
        // at the end of the bar. See duration.ts
        // if (this.priority === C.Type.Duration && mctx.beat === 0) {
        //     this.ctxData = new C.MetreContext({
        //         attributes: mctx.attributes,
        //         beat: mctx.ts.beats,
        //         bar: mctx.bar - 1,
        //         endMarker: false,
        //         ts: mctx.ts
        //     });
        // } else {
        this.ctxData = new C.MetreContext(mctx);
        // }
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Make sure a model (be it a placeholder or not) is needed here because either:
        //  1) One of the models at the current location is not a placeholder
        //  2) The starting beat is different (this isn't a stable situation -- the
        //     annotation process will eventually either make (1) true, or decide that no
        //     model is required at this index). If we haven't gotten to writing the
        //     starting beat, conservatively assume this placeholder is needed.
        var loc = new C.Location(ctx.loc);
        var usefulItems = ctx.findVertical(obj => obj.type !== C.Type.Placeholder || !obj.ctxData || !loc.eq(obj.ctxData));
        if (!usefulItems.length) {
            return ctx.eraseCurrent();
        }

        var realItems = ctx.findVertical(obj => obj.type !== C.Type.Placeholder);

        // Remove extraneous placeholders that may have been caused by the above operation.
        while (ctx.next() && !ctx.findVertical(obj => obj.type !== C.Type.Placeholder, ctx.idx + 1).length) {
            ctx.eraseFuture(ctx.idx + 1);
        }

        if (this.priority !== realItems[0].type) {
            console.warn("Dangerously correcting a mismatched type.");
            this.priority = realItems[0].type;
        }

        // Only correct rhythm if the beat is valid (otherwise, our rhythmicSpellcheck
        // won't give sensible results!)
        if (ctx.ts && ctx.__globalBeat__ < ctx.ts.beats) {
            // Add in rests, if needed. (This is part of the reason (2) is needed above).
            if (ctx.beat < ctx.__globalBeat__) {
                return PlaceholderModel.fillMissingBeats(ctx);
            }

            if (ctx.beat === ctx.__globalBeat__ && this.priority === C.Type.Duration) {
                assert(realItems[0], "We can't have an entire column of fake durations,");
                return PlaceholderModel.fillMissingBeats(ctx, realItems[0].calcBeats(ctx));
            }
        }

        // Type specific logic.
        switch(this.priority) {
            case C.Type.Attributes:
                // STOPSHIP: Find the part leader.
                ctx.attributes = ctx._voices[0].body[ctx.idx];
                break;
            case C.Type.Barline:
                ctx.body.splice(ctx.idx, 1, new BarlineModel({ barStyle: {data: C.MusicXML.BarStyleType.Regular }}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.Begin:
                ctx.body.splice(ctx.idx, 1, new BeginModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.Clef:
                if (ctx.part.staves > ctx.voiceIdx && !("priority" in ctx.attributes.clefs[ctx.voiceIdx])) { // This checks if it's a model
                    var newClef =  new ClefModel(ctx.attributes.clefs[ctx.voiceIdx], true)
                    ctx.body.splice(ctx.idx, 1, newClef); // FIXME
                    ctx.attributes.clefs[ctx.voiceIdx] = newClef;
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed  = this.proposed;
                    return C.IterationStatus.RetryCurrent;
                }
                break;
            case C.Type.Duration:
                assert(!ctx.findVertical(c => c.priority !== C.Type.Duration).length);
                if (ctx.next(null, 1, true).type /* not priority! */ === C.Type.BeamGroup) {
                    var bodies: Array<Model> = ctx.findVertical(() => true, this.idx + 1);
                    ctx.eraseFuture(this.idx + 1);
                    ctx.insertPastVertical(bodies);
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed  = this.proposed;
                    return C.IterationStatus.RetryCurrent;
                }
                break;
            case C.Type.EndMarker:
                ctx.body.splice(ctx.idx, 1, new EndMarkerModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.KeySignature:
                if (ctx.part.staves > ctx.voiceIdx) {
                    var ks = C.JSONx.clone(<KeySignatureModel>realItems[0]);
                    assert(ks, "Undefined prevKeySignature!!");
                    ctx.body.splice(ctx.idx, 1, new KeySignatureModel({ keySignature: ks }, true));
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed  = this.proposed;
                    return C.IterationStatus.RetryCurrent;
                }
                break;
            case C.Type.NewLine:
                ctx.body.splice(ctx.idx, 1, new NewlineModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.NewPage:
                ctx.body.splice(ctx.idx, 1, new NewpageModel({}, true));
                ctx.body[ctx.idx].annotated = this.annotated;
                ctx.body[ctx.idx].proposed  = this.proposed;
                return C.IterationStatus.RetryCurrent;
            case C.Type.TimeSignature:
                if (ctx.part.staves > ctx.voiceIdx) {
                    var tses = ctx.findVertical(obj => obj.type === C.Type.TimeSignature);
                    assert(tses.length, "Staves cannot all be placeholders!");
                    ctx.body.splice(ctx.idx, 1, new TimeSignatureModel(<TimeSignatureModel> (<any>tses[0]).toMXMLObject(), true));
                    ctx.body[ctx.idx].annotated = this.annotated;
                    ctx.body[ctx.idx].proposed  = this.proposed;
                    return C.IterationStatus.RetryCurrent;
                }
                break;
        }

        // HACK HACK HACK! Sometimes recordMetreDataImpl isn't run when only Placeholders have been added or removed.
        if (this.priority !== C.Type.Print) {
            this.recordMetreDataImpl(ctx);
        }

        return C.IterationStatus.Success;
    }

    ////////////////
    // IV. Static //
    ////////////////

    static fillMissingBeats(ctx: Annotator.Context, extraBeats?: number): C.IterationStatus {
        extraBeats = extraBeats || 0;
        var rest: {} = { chord: [{ step: "R", octave: null, acc: null }] };
        var missingBeats = Metre.subtract(ctx.__globalBeat__ + extraBeats,
            ctx.beat, ctx).map(
                spec => new DurationModel(<C.IPitchDuration>_.extend(spec, rest),
                    true));
        ctx.splice(ctx.idx, 1, missingBeats, Annotator.SplicePolicy.Masked);
        return C.IterationStatus.RetryLine;
    }
}

PlaceholderModel.prototype._priority = C.Type.Unknown;

export = PlaceholderModel;
