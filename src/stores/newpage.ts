import Model = require("./model");

import _ = require("lodash");

import C = require("./contracts");
import Context = require("./context");

class NewPageModel extends Model {
    annotateImpl(ctx: Context): C.IterationStatus {
        ctx.y = 0;

        ctx.pageLines = _.clone(ctx.pageLines);
        ctx.pageLines.push(ctx.line + 1);

        ctx.pageStarts = _.clone(ctx.pageStarts);
        ctx.pageStarts.push(ctx.idx);
        return C.IterationStatus.SUCCESS;
    }
    visible() {
        return false;
    }
    toLylite(lylite: Array<string>) {
        if (!this._annotated) {
            lylite.push("\\pageBreak");
        }
    }

    static createNewPage = (ctx: Context) => {
        ctx.insertPast(new NewPageModel({newpage: true, _annotated: "createNewPage"}));
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i].type === C.Type.NEWPAGE && ctx.body[i]._annotated) {
                ctx.eraseFuture(i);
                --i;
            }
        }
        return C.IterationStatus.RETRY_CURRENT;
    };

    get type() {
        return C.Type.NEWPAGE;
    }
}

/* tslint:disable */
// TS is overly aggressive about optimizing out require() statements.
// We require Model since we extend it. This line forces the require()
// line to not be optimized out.
Model.length;
/* tslint:enable */

export = NewPageModel;
