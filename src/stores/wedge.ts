/**
 * @file Model for things such as crescendos and diminuendos.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, November 2014
 */

import Model        = require("./model");

import Annotator    = require("./annotator");
import C            = require("./contracts");
import assert       = require("assert");

class WedgeModel extends Model /* implements C.MusicXML.Wedge */ {
    ///////////////
    // I.1 Model //
    ///////////////
    get type()                      { return C.Type.Wedge; }
    get xPolicy()                   { return C.RectifyXPolicy.Min; }
    get fields(): string[]          { return ["wedgeType"]; }

    ////////////////////
    // I.2 WedgeModel //
    ////////////////////
    wedgeType: C.MusicXML.WedgeType;
    endpoint: WedgeModel;

    ////////////////////
    // II. Life-cycle //
    ////////////////////

    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData = new C.MetreContext(mctx);
    }

    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        // Wedges are paired.
        if (this.wedgeType === C.MusicXML.WedgeType.Stop) {
            var endpoint            = ctx.prev(m => m.type === C.Type.Wedge, 1);
            assert.equal(endpoint.type, C.Type.Wedge);
            assert.notEqual((<WedgeModel>endpoint).wedgeType, C.MusicXML.WedgeType.Stop);
            this.endpoint           = <WedgeModel> endpoint;
            this.endpoint.endpoint  = this;
        }

        // Wedges have no logical width.
        return C.IterationStatus.Success;
    }

}

export = WedgeModel;