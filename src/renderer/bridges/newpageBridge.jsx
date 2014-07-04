/**
 * @jsx React.DOM
 */

var Bridge = require("./bridge.jsx");

var _ = require("underscore");

class NewPageBridge extends Bridge {
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
}

NewPageBridge.prototype.prereqs = [
];

var createNewPage = (ctx) => {
    ctx.insertPast(new NewPageBridge({newpage: true, _annotated: "createNewPage"}));
    for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
        if (ctx.body[i].newpage && ctx.body[i]["_annotated"]) {
            ctx.eraseFuture(i);
            --i;
        }
    }
    return -1;
};

module.exports = NewPageBridge;
module.exports.createNewPage = createNewPage;
