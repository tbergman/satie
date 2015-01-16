var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TypedReact = require("typed-react");
var React = require("react");
var C = require("../stores/contracts");
var Line = require("./_line");
var Wedge = (function (_super) {
    __extends(Wedge, _super);
    function Wedge() {
        _super.apply(this, arguments);
    }
    Wedge.prototype.render = function () {
        var spec = this.props.spec;
        var strokeWidth = 0.04;
        var isCrec = spec.wedgeType === 0 /* Crescendo */;
        if (spec.wedgeType === 2 /* Stop */) {
            return null;
        }
        var yOut = [
            spec.y - strokeWidth / 2 + 1.2 - 0.15,
            spec.y - strokeWidth / 2 + 1.2 + 0.15
        ];
        var yIn = [
            spec.y - strokeWidth / 2 + 1.2,
            spec.y - strokeWidth / 2 + 1.2,
        ];
        return React.createElement("g", null, React.createElement(Line.Component, { x1: spec.x, x2: spec.x + 0.8, y1: (isCrec ? yIn : yOut)[0], y2: (isCrec ? yOut : yIn)[0], stroke: "#000000", strokeWidth: 0.04 }), React.createElement(Line.Component, { x1: spec.x, x2: spec.x + 0.8, y1: (isCrec ? yIn : yOut)[1], y2: (isCrec ? yOut : yIn)[1], stroke: "#000000", strokeWidth: 0.04 }));
    };
    Wedge.prototype.shouldComponentUpdate = function (nextProps) {
        var oldHash = this._hash;
        this._hash = C.JSONx.hash(nextProps);
        return oldHash !== this._hash;
    };
    return Wedge;
})(TypedReact.Component);
var Wedge;
(function (Wedge) {
    "use strict";
    Wedge.Component = TypedReact.createClass(Wedge);
})(Wedge || (Wedge = {}));
module.exports = Wedge;
