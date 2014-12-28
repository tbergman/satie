var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var C = require("./contracts");
var NewPageModel = (function (_super) {
    __extends(NewPageModel, _super);
    function NewPageModel() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(NewPageModel.prototype, "visible", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NewPageModel.prototype, "type", {
        get: function () {
            return 120 /* NewPage */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NewPageModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    NewPageModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    NewPageModel.prototype.annotateImpl = function (ctx) {
        ctx.y = 0;
        ctx.pageLines = _.clone(ctx.pageLines);
        ctx.pageLines.push(ctx.line + 1);
        ctx.pageStarts = _.clone(ctx.pageStarts);
        ctx.pageStarts.push(ctx.idx);
        return 10 /* Success */;
    };
    NewPageModel.createNewPage = function (ctx) {
        ctx.insertPast(new NewPageModel({ newpage: true }, true));
        for (var i = ctx.idx + 1; i < ctx.body.length; ++i) {
            if (ctx.body[i].type === 120 /* NewPage */ && ctx.body[i].annotated) {
                ctx.eraseFuture(i);
                --i;
            }
        }
        return 20 /* RetryCurrent */;
    };
    return NewPageModel;
})(Model);
module.exports = NewPageModel;
