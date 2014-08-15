import Model = require("./model");

import _ = require("lodash");

import Context = require("./context");
import Contracts = require("./contracts");
import IterationStatus = require("./iterationStatus");
import SmartCondition = require("./smartCondition");

class NewPageModel extends Model {
    annotateImpl(ctx: Context): IterationStatus {
        ctx.y = 0;

        ctx.pageLines = _.clone(ctx.pageLines);
        ctx.pageLines.push(ctx.line + 1);

        ctx.pageStarts = _.clone(ctx.pageStarts);
        ctx.pageStarts.push(ctx.idx);
        return IterationStatus.SUCCESS;
    }
    visible() {
        return false;
    }
    toLylite(lylite: Array<string>) {
        if (!this["_annotated"]) {
            lylite.push("\\pageBreak");
        }
    }

    static createNewPage = (ctx: Context) => {
        ctx.insertPast(new NewPageModel({newpage: true, _annotated: "createNewPage"}));
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i].type === Contracts.ModelType.NEWPAGE && ctx.body[i]["_annotated"]) {
                ctx.eraseFuture(i);
                --i;
            }
        }
        return IterationStatus.RETRY_CURRENT;
    };

    prereqs = NewPageModel.prereqs;

    static prereqs : Array<SmartCondition> = [
    ];

    get type() {
        return Contracts.ModelType.NEWPAGE;
    }
}
Model.length; // BUG in typescriptifier!

export = NewPageModel;
