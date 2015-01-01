var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Dot = (function (_super) {
    __extends(Dot, _super);
    function Dot() {
        _super.apply(this, arguments);
    }
    Dot.prototype.render = function () {
        return React.DOM.g(null, React.DOM.circle({
            "data-selection-info": "dotted",
            cx: (this.cx()),
            cy: (this.cy()),
            fill: this.props.stroke,
            r: (this.props.radius)
        }), global.isChoreServer ? null : React.DOM.rect({
            "data-selection-info": "dotted",
            width: 3,
            height: 3,
            x: (this.cx() - 4),
            y: (this.cy() - 4),
            fill: "transparent",
            className: "mn_handle"
        }));
    };
    Dot.prototype.cyOffset = function () {
        return ((this.props.line * 2) % 2) ? 0 : 5;
    };
    Dot.prototype.cx = function () {
        return this.props.x + 6 * (this.props.idx);
    };
    Dot.prototype.cy = function () {
        return this.props.y - (this.props.line - 3) * 10 - this.cyOffset();
    };
    return Dot;
})(TypedReact.Component);
var Dot;
(function (Dot) {
    "use strict";
    Dot.Component = TypedReact.createClass(Dot, [PureRenderMixin]);
})(Dot || (Dot = {}));
module.exports = Dot;
