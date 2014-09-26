/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, September 2014
 */

import Model = require("./model");

import Annotator = require("./annotator");
import BarlineModel = require("./barline");
import BeginModel = require("./begin");
import C = require("./contracts");
import DurationModel = require("./duration");
import EndMarkerModel = require("./endMarker");
import Metre = require("./metre");
import TimeSignatureModel = require("./timeSignature");

import _ = require("lodash");
import assert = require("assert");

/**
 * Models with the same index in each staff have the same starting location and
 * priority (which is, except for placeholders, equal to type). Whenever a model
 * of a certain type and location exists in one stave but not another, a PlaceholderModel
 * is added to the stave without such a type. The priority of a PlaceholderModel
 * is equal to the type in the other stave.
 */
class PlaceholderModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Make sure we're actually being useful.
        var realItems = ctx.findVertical(obj => obj.type !== C.Type.PLACEHOLDER);
        if (!realItems.length) {
            return ctx.eraseCurrent();
        }

        if (ctx.idx + 1 !== ctx.body.length) {
            while (!ctx.findVertical(obj => obj.type !== C.Type.PLACEHOLDER, ctx.idx + 1).length) {
                ctx.eraseFuture(ctx.idx + 1);
            }
        }
        
        // Do we need this?
        this._priority = realItems[0].type;

        if (ctx.beat < ctx.__globalBeat__) {
            return this._eatBeats(ctx);
        }
        switch(this.priority) {
            case C.Type.BARLINE:
                ctx.body.splice(ctx.idx, 1, new BarlineModel({ barline: C.Barline.Standard }));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.BEGIN:
                ctx.body.splice(ctx.idx, 1, new BeginModel({}));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.DURATION:
                assert(!ctx.findVertical(c => c.priority !== C.Type.DURATION).length);
                console.log(ctx.idx, C.Type[ctx.next(null, 1, true).type], C.Type[ctx.next(null, 1, true).priority]);
                if (ctx.next(null, 1, true).type /* not priority! */ === C.Type.BEAM_GROUP) {
                    var bodies: Array<Model> = ctx.findVertical(() => true, this.idx + 1);
                    debugger;
                    ctx.eraseFuture(this.idx + 1);
                    ctx.insertPastVertical(bodies);
                    debugger;
                    return C.IterationStatus.RETRY_CURRENT;
                }
                break;
            case C.Type.TIME_SIGNATURE:
                var tses = ctx.findVertical(obj => obj.type === C.Type.TIME_SIGNATURE);
                assert(tses.length, "Staves cannot all be placeholders!");
                ctx.body.splice(ctx.idx, 1, new TimeSignatureModel({ timeSignature: tses[0].timeSignature }));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.END_MARKER:
                ctx.body.splice(ctx.idx, 1, new EndMarkerModel({}));
                return C.IterationStatus.RETRY_CURRENT;
        }
        this.recordMetreDataImpl(ctx); // Optimization. Sometimes recordMetreDataImpl isn't run.
        return C.IterationStatus.SUCCESS;
    }

    constructor(spec: {_priority: string}) {
        super(spec);
        assert(isNaN(<any>spec._priority), "Expected string");

        this._priority = (<any>C.Type)[spec._priority];
        assert(!isNaN(this._priority));
    }

    visible() {
        return false;
    }

    toLylite(lylite: Array<string>, unresolved?: Array<(obj: Model) => boolean>) {
        return; // noop
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            _priority: C.Type[this._priority]
        });
    }

    _priority: C.Type;
    get priority(): C.Type {
        return this._priority;
    }

    set priority(p: C.Type) {
        assert(!isNaN(p), "Expected enum");
        this._priority = p;
    }

    get type(): C.Type {
        return C.Type.PLACEHOLDER;
    }

    get placeholder() {
        return true;
    }

    set placeholder(b: boolean) {
        assert(false, "A PlaceholderModel cannot help but be a placeholder, however much it tries...");
    }

    private _eatBeats(ctx: Annotator.Context): C.IterationStatus {
        var rest: {} = { chord: [{ pitch: "r", octave: null, acc: null }] };
        var missingBeats = Metre.subtract(ctx.__globalBeat__, ctx.beat, ctx, ctx.beat)
            .map(spec => new DurationModel(<C.IPitchDuration>_.extend(spec, rest), C.Source.ANNOTATOR));
        for (var i = missingBeats.length - 1; i >= 0; --i) {
            ctx.insertPast(missingBeats[i]);
        }
        return C.IterationStatus.RETRY_CURRENT_NO_OPTIMIZATIONS;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = PlaceholderModel;
