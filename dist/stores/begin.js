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
            return ctx.insertPast(new PrintModel({
                systemLayout: {
                    topSystemDistance: 0,
                    systemMargins: {
                        leftMargin: 108
                    }
                }
            }, true));
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
        ctx.lines[ctx.line]._attributes[ctx.part.id] = {};
        ctx.minBottomPaddings = _.times(ctx._voices.length + 1, function () { return 0; });
        ctx.minTopPaddings = _.times(ctx._voices.length + 1, function () { return 0; });
        this.x = ctx.x;
        this.y = ctx.y;
        this.staveW = ctx.maxX - ctx.x;
        this.startOfSystem = !ctx.idxInPart && _.keys(ctx.part.containsVoice).length > 1;
        ctx.x += 8;
        ctx.barKeys = [];
        this.voice = ctx.voice;
        if (typeof window === "undefined" || global.location.href.indexOf("/scales/") !== -1) {
            this.noMargin = true;
        }
        else {
            this.noMargin = false;
        }
        this.braceY = this.y;
        this.braceY2 = this.y;
        return 10 /* Success */;
    };
    return BeginModel;
})(Model);
module.exports = BeginModel;
