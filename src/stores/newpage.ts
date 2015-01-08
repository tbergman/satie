/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Model = require("./model");

import _ = require("lodash");

import C = require("./contracts");
import Annotator = require("./annotator");

/**
 * A manual or automatic hint that rendering after this item should be
 * on a new page.
 */
class NewPageModel extends Model {
    /* Model */
    get visible()       { return false; }
    get type()          { return C.Type.NewPage; }
    get xPolicy()       { return C.RectifyXPolicy.Max; }

    /* Life-cycle */
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
