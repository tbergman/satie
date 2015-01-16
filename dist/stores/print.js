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
        var spec = deepAssign(this, defaultPrint);
        ctx.print = new C.Print(spec);
        return 10 /* Success */;
    };
    return PrintModel;
})(Model);
function deepAssign(a, b) {
    "use strict";
    if (a instanceof Array || b instanceof Array) {
        var retArr = [];
        var aArr = a;
        var bArr = b;
        for (var i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return retArr;
    }
    else if (a instanceof Object || b instanceof Object) {
        var ret = a ? C.JSONx.clone(a) : {};
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                ret[key] = deepAssign(ret[key], b[key]);
            }
        }
        return ret;
    }
    else {
        return (a === undefined) ? b : a;
    }
}
module.exports = PrintModel;
