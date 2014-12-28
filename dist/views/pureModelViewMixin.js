var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TypedReact = require("typed-react");
var C = require("../stores/contracts");
var PureModelViewMixin = (function (_super) {
    __extends(PureModelViewMixin, _super);
    function PureModelViewMixin() {
        _super.apply(this, arguments);
    }
    PureModelViewMixin.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        var oldHash = this._hash;
        this._hash = C.JSONx.hash(nextProps) + nextProps.spec.x * 9973 + nextProps.spec.y * 997;
        return oldHash !== this._hash;
    };
    return PureModelViewMixin;
})(TypedReact.Mixin);
var Mixin = TypedReact.createMixin(PureModelViewMixin);
module.exports = Mixin;
