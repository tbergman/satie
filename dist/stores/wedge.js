var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Model = require("./model");
var C = require("./contracts");
var assert = require("assert");
var WedgeModel = (function (_super) {
    __extends(WedgeModel, _super);
    function WedgeModel() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(WedgeModel.prototype, "type", {
        get: function () {
            return 475 /* Wedge */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WedgeModel.prototype, "xPolicy", {
        get: function () {
            return 2 /* Min */;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WedgeModel.prototype, "fields", {
        get: function () {
            return ["wedgeType"];
        },
        enumerable: true,
        configurable: true
    });
    WedgeModel.prototype.recordMetreDataImpl = function (mctx) {
        this.ctxData = new C.MetreContext(mctx);
    };
    WedgeModel.prototype.annotateImpl = function (ctx) {
        if (this.wedgeType === 2 /* Stop */) {
            var endpoint = ctx.prev(function (m) { return m.type === 475 /* Wedge */; }, 1);
            assert.equal(endpoint.type, 475 /* Wedge */);
            assert.notEqual(endpoint.wedgeType, 2 /* Stop */);
            this.endpoint = endpoint;
            this.endpoint.endpoint = this;
        }
        return 10 /* Success */;
    };
    return WedgeModel;
})(Model);
module.exports = WedgeModel;
