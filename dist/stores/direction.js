var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var C = require("./contracts");
var DirectionModel = (function (_super) {
    __extends(DirectionModel, _super);
    function DirectionModel(spec, annotated) {
        _super.call(this, spec, annotated);
    }
    Object.defineProperty(DirectionModel.prototype, "type", {
        get: function () {
            return 410 /* Direction */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DirectionModel.prototype, "xPolicy", {
        get: function () {
            return 2 /* Min */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DirectionModel.prototype, "fields", {
        get: function () {
            return [
                "directionTypes",
                "staff",
                "offset",
                "sound",
                "voice",
                "footnote",
                "level",
                "placement",
                "data",
                "relativeY",
                "relativeX",
                "fontFamily",
                "fontWeight",
                "fontStyle",
                "fontSize",
                "color"
            ];
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DirectionModel.prototype, "defaultX", {
        get: function () {
            return this.x;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DirectionModel.prototype, "defaultY", {
        get: function () {
            return this.y;
        },
        enumerable: true,
        configurable: true
    });
    DirectionModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    DirectionModel.prototype.annotateImpl = function (ctx) {
        return 10 /* Success */;
    };
    return DirectionModel;
})(Model);
module.exports = DirectionModel;
