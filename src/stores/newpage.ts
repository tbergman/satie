import Model = require("./model");

import _ = require("lodash");

class NewPageModel extends Model {
    annotateImpl(ctx) {
        ctx.y = 0;

        ctx.pageLines = _.clone(ctx.pageLines);
        ctx.pageLines.push(ctx.line + 1);

        ctx.pageStarts = _.clone(ctx.pageStarts);
        ctx.pageStarts.push(ctx.idx);
        return true;
    }
    visible() {
        return false;
    }
    toLylite(lylite) {
        if (!this["_annotated"]) {
            lylite.push("\\pageBreak");
        }
    }

    static createNewPage = (ctx) => {
        ctx.insertPast(new NewPageModel({newpage: true, _annotated: "createNewPage"}));
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i].newpage && ctx.body[i]["_annotated"]) {
                ctx.eraseFuture(i);
                --i;
            }
        }
        return -1;
    };

    prereqs = NewPageModel.prereqs;

    static prereqs = [
    ];
}
Model.length; // BUG in typescriptifier!

export = NewPageModel;
