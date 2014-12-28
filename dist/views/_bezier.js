var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Bezier = (function (_super) {
    __extends(Bezier, _super);
    function Bezier() {
        _super.apply(this, arguments);
    }
    Bezier.prototype.render = function () {
        return React.DOM.path({
            d: ("M" + this.props.x1 + "," + this.props.y1 + "C" + this.props.x2 + "," + this.props.y2 + " " + this.props.x3 + "," + this.props.y3 + " " + this.props.x4 + "," + this.props.y4 + " " + "C" + this.props.x5 + "," + this.props.y5 + " " + this.props.x6 + "," + this.props.y6 + " " + this.props.x1 + "," + this.props.y1),
            fill: this.props.fill,
            strokeWidth: this.props.strokeWidth,
            stroke: this.props.stroke
        });
    };
    return Bezier;
})(TypedReact.Component);
var Bezier;
(function (Bezier) {
    "use strict";
    Bezier.Component = TypedReact.createClass(Bezier, [PureRenderMixin]);
})(Bezier || (Bezier = {}));
module.exports = Bezier;
