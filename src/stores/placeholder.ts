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
import ClefModel = require("./clef");
import DurationModel = require("./duration");
import EndMarkerModel = require("./endMarker");
import KeySignatureModel = require("./keySignature");
import Metre = require("./metre");
import NewlineModel = require("./newline");
import NewpageModel = require("./newpage");
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
        // Make sure a model (be it a placeholder or not) is needed here because either:
        //  1) One of the models at the current location is not a placeholder
        //  2) The starting beat is different (this isn't a stable situation -- the
        //     annotation process will eventually either make (1) true, or decide that no
        //     model is required at this index). If we haven't gotten to writing the starting beat,
        //     conservatively assume this placeholder is needed.
        var loc = new C.Location(ctx.loc);
        var usefulItems = ctx.findVertical(obj => obj.type !== C.Type.PLACEHOLDER || !obj.ctxData || !loc.eq(obj.ctxData));
        if (!usefulItems.length) {
            return ctx.eraseCurrent();
        }

        // See if the next real (not placeholder) model could replace this model (same type & starting beat).
        // If so, remove everything between the previous element and that model, exclusive.
        var realItems = ctx.findVertical(obj => obj.type !== C.Type.PLACEHOLDER);
        if (ctx.nextActualType === realItems[0].type) {
            var changed = false;
            while (ctx.body[ctx.idx].type === C.Type.PLACEHOLDER && realItems[0].ctxData &&
                    (new C.Location(realItems[0].ctxData)).ge(loc)) {
                changed = true;
                ctx.body.splice(ctx.idx, 1);
            }
            if (changed) {
                return C.IterationStatus.RETRY_CURRENT;
            }
        }

        // Remove extraneous placeholders that may have been caused by the above operation.
        if (ctx.idx + 1 !== ctx.body.length) {
            while (!ctx.findVertical(obj => obj.type !== C.Type.PLACEHOLDER, ctx.idx + 1).length) {
                ctx.eraseFuture(ctx.idx + 1);
            }
        }

        // Make sure the placeholder has the correct type.
        // Ideally, we would never get in such a situation, however it is possible because of the "real item"
        // condition above.
        if (this._priority !== realItems[0].type) {
            ctx.body.splice(ctx.idx, 1);
            return C.IterationStatus.RETRY_CURRENT;
        }

        // Add in rests, if needed. (This is part of the reason (2) is needed above).
        if (ctx.beat < ctx.__globalBeat__) {
            return PlaceholderModel.fillMissingBeats(ctx);
        }

        // See if we should replace a placeholder for a real type...
        switch(this.priority) {
            case C.Type.BARLINE:
                ctx.body.splice(ctx.idx, 1, new BarlineModel({ barline: C.Barline.Standard }));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.BEGIN:
                ctx.body.splice(ctx.idx, 1, new BeginModel({}));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.CLEF:
                if (!ctx.clef) {
                    ctx.body.splice(ctx.idx, 1, new ClefModel({ clef: "detect" }));
                    return C.IterationStatus.RETRY_CURRENT;
                }
                break;
            case C.Type.DURATION:
                assert(!ctx.findVertical(c => c.priority !== C.Type.DURATION).length);
                if (ctx.next(null, 1, true).type /* not priority! */ === C.Type.BEAM_GROUP) {
                    var bodies: Array<Model> = ctx.findVertical(() => true, this.idx + 1);
                    ctx.eraseFuture(this.idx + 1);
                    ctx.insertPastVertical(bodies);
                    return C.IterationStatus.RETRY_CURRENT;
                }
                break;
            case C.Type.END_MARKER:
                ctx.body.splice(ctx.idx, 1, new EndMarkerModel({}));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.KEY_SIGNATURE:
                if (!ctx.keySignature) {
                    ctx.body.splice(ctx.idx, 1, new KeySignatureModel({ keySignature: ctx.prevKeySignature }));
                    return C.IterationStatus.RETRY_CURRENT;
                }
                break;
            case C.Type.NEWLINE:
                ctx.body.splice(ctx.idx, 1, new NewlineModel({}));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.NEWPAGE:
                ctx.body.splice(ctx.idx, 1, new NewpageModel({}));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.TIME_SIGNATURE:
                var tses = ctx.findVertical(obj => obj.type === C.Type.TIME_SIGNATURE);
                assert(tses.length, "Staves cannot all be placeholders!");
                ctx.body.splice(ctx.idx, 1, new TimeSignatureModel({ timeSignature: tses[0].timeSignature }));
                return C.IterationStatus.RETRY_CURRENT;
        }

        // HACK HACK HACK! Sometimes recordMetreDataImpl isn't run when only Placeholders have been added or removed.
        this.recordMetreDataImpl(ctx);

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

    static fillMissingBeats(ctx: Annotator.Context): C.IterationStatus {
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
