var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var _ = require("lodash");
var C = require("./contracts");
var PrintModel = require("./print");
var BeginModel = (function (_super) {
    __extends(BeginModel, _super);
    function BeginModel() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(BeginModel.prototype, "type", {
        get: function () {
            return 140 /* Begin */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BeginModel.prototype, "xPolicy", {
        get: function () {
            return 2 /* Min */;
        },
        enumerable: true,
        configurable: true
    });
    BeginModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    BeginModel.prototype.annotateImpl = function (ctx) {
        if (!ctx.print) {
            return ctx.insertPast(new PrintModel({}, true));
        }
        if (ctx.idx !== 1) {
            return ctx.eraseCurrent();
        }
        var print = ctx.print;
        var systemMargins = print.systemLayout.systemMargins;
        var pageMargins = print.pageMarginsFor(ctx.page);
        var pageLayout = print.pageLayout;
        ctx.fontSize = ctx.calcFontSize();
        ctx.maxX = pageLayout.pageWidth - systemMargins.rightMargin - pageMargins.rightMargin;
        ctx.maxY = pageLayout.pageHeight - pageMargins.topMargin;
        ctx.x = systemMargins.leftMargin + pageMargins.leftMargin;
        ctx.y = pageMargins.topMargin + print.systemLayout.topSystemDistance;
        ctx.lines[ctx.line].y = ctx.y;
        ctx.lines[ctx.line].x = ctx.x;
        ctx.minBottomPaddings = _.times(ctx._parts.length, function () { return 0; });
        ctx.minTopPaddings = _.times(ctx._parts.length, function () { return 0; });
        this.x = ctx.x;
        this.y = ctx.y;
        this.width = ctx.maxX - ctx.x;
        ctx.x += 8;
        ctx.barKeys = [];
        this.part = ctx.currStave;
        if (typeof window === "undefined" || global.location.href.indexOf("/scales/") !== -1) {
            this.noMargin = true;
        }
        else {
            this.noMargin = false;
        }
        this.braceY = this.y;
        this.braceY2 = this.y + ctx.staveSpacing * (ctx._parts.length - 1);
        return 10 /* Success */;
    };
    BeginModel.createBegin = function (ctx) {
        return ctx.insertPast(new BeginModel({ source: true }, true));
    };
    return BeginModel;
})(Model);
module.exports = BeginModel;
