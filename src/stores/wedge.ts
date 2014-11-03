/**
 * @file Model for things such as crescendos and diminuendos.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, November 2014
 */

import Model = require("./model");

import Annotator = require("./annotator");
import C = require("./contracts");
import assert = require("assert");

import _ = require("lodash");

class WedgeModel extends Model {
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Wedges are paired.
        if (this.wedgeType === WedgeModel.Type.Stop) {
            var endpoint = ctx.prev(m => m.type === C.Type.Wedge, 1);
            assert.equal(endpoint.type, C.Type.Wedge);
            assert.notEqual((<WedgeModel>endpoint).wedgeType, WedgeModel.Type.Stop);
            this.endpoint = <WedgeModel> endpoint;
            this.endpoint.endpoint = this;
        }

        // Wedges have no logical width.
        return C.IterationStatus.Success;
    }

    toJSON(): {} {
        return _.extend(super.toJSON(), {
            wedgeType: this.wedgeType
        });
    }

    get type() {
        return C.Type.Wedge;
    }
    wedgeType: WedgeModel.Type;
    endpoint: WedgeModel;
}

module WedgeModel {
    "use strict";
    export enum Type {
        // Warning: The numbers are saved/reloaded in toJSON
        // TODO(jnetterf): Write a test and get rid of this comment
        Crescendo = 0,
        Diminuendo = 1,
        Stop = 2
    }
}

export = WedgeModel;