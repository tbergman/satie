var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var C = require("./contracts");
var PrintModel = (function (_super) {
    __extends(PrintModel, _super);
    function PrintModel() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(PrintModel.prototype, "type", {
        get: function () {
            return 50 /* Print */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrintModel.prototype, "visible", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrintModel.prototype, "xPolicy", {
        get: function () {
            return 1 /* Max */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PrintModel.prototype, "fields", {
        get: function () {
            return [
                "measureNumbering",
                "partNameDisplay",
                "newSystem",
                "newPage",
                "blankPage",
                "measureLayout",
                "partAbbreviationDisplay",
                "pageLayout",
                "systemLayout",
                "staffSpacing",
                "staffLayouts",
                "pageNumber"
            ];
        },
        enumerable: true,
        configurable: true
    });
    PrintModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    PrintModel.prototype.annotateImpl = function (ctx) {
        var defaultPrint = C.getPrint(ctx._layout.header);
        var spec = C.deepAssign(this, defaultPrint);
        ctx.print = new C.Print(spec);
        return 10 /* Success */;
    };
    return PrintModel;
})(Model);
module.exports = PrintModel;
