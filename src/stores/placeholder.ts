/**
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, September 2014
 */

import Model = require("./model");

import Annotator = require("./annotator");
import C = require("./contracts");

import _ = require("lodash");

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
}

Model.constructorsByType[C.Type[C.Type.PLACEHOLDER]] = (spec: any) => new PlaceholderModel(spec);

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = PlaceholderModel;
