/**
 * @file A manual or automatic hint that rendering after this item should be
 * on a new page.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import Model = require("./model");

import _ = require("lodash");

import C = require("./contracts");
import Annotator = require("./annotator");

class NewPageModel extends Model {
    /* Model */
    get visible()       { return false; }
    get type()          { return C.Type.NewPage; }
    get xPolicy()       { return C.RectifyXPolicy.Max; }

    /* Lifecycle */
    recordMetreDataImpl(mctx: C.MetreContext) {
        this.ctxData    = new C.MetreContext(mctx);
    }
    annotateImpl(ctx: Annotator.Context): C.IterationStatus {
        ctx.y = 0;

        ctx.pageLines   = _.clone(ctx.pageLines);
        ctx.pageLines.push(ctx.line + 1);

        ctx.pageStarts  = _.clone(ctx.pageStarts);
        ctx.pageStarts.push(ctx.idx);

        return C.IterationStatus.Success;
    }

    /* Static */
    static createNewPage = (ctx: Annotator.Context) => {
        ctx.insertPast(new NewPageModel({newpage: true}, true));

        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i].type === C.Type.NewPage && ctx.body[i].annotated) {
                ctx.eraseFuture(i);
                --i;
            }
        }
        return C.IterationStatus.RetryCurrent;
    };
}

export = NewPageModel;
