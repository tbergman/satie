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
import EndMarkerModel = require("./endMarker");
import TimeSignatureModel = require("./timeSignature");

import _ = require("lodash");
import assert = require("assert");

/**
 * Models in different staves with the same position and type have the same index.
 * PlaceholderModel facilitates this by filling a slot in the body array when one stave
 * does not have an analogue. Sorry if I didn't explain that well.
 */
class PlaceholderModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        switch(this.priority) {
            case C.Type.BARLINE:
                ctx.body.splice(ctx.idx, 1, new BarlineModel({ barline: C.Barline.Standard }));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.BEGIN:
                ctx.body.splice(ctx.idx, 1, new BeginModel({}));
                return C.IterationStatus.RETRY_CURRENT;
            case C.Type.DURATION:
                if (ctx.next() && ctx.next().priority === C.Type.DURATION) {
                    for (var i = ctx.idx; i < ctx.body.length && ctx.body[i].priority === C.Type.DURATION; ++i) {
                        // XXX: Check location
                        if (ctx.body[i].type === C.Type.DURATION) {
                            ctx.body[ctx.idx] = ctx.body[i];
                            ctx.body[i] = this;
                            return C.IterationStatus.RETRY_CURRENT_NO_OPTIMIZATIONS;
                        }
                    }
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
        this.ctxData = new C.MetreContext(ctx);
        return C.IterationStatus.SUCCESS;
    }

    constructor(spec: {_priority: string}) {
        super(spec);

        this._priority = (<any>C.Type)[spec._priority];
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
        this._priority = p;
    }

    get type(): C.Type {
        return C.Type.PLACEHOLDER;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = PlaceholderModel;
