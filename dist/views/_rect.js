var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Rect = (function (_super) {
    __extends(Rect, _super);
    function Rect() {
        _super.apply(this, arguments);
    }
    Rect.prototype.render = function () {
        return React.DOM.rect({
            className: this.props.className,
            opacity: this.props.opacity || 1.0,
            x: (this.props.x),
            y: (this.props.y),
            stroke: this.props.stroke,
            fill: this.props.fill,
            height: (this.props.height),
            width: (this.props.width)
        });
    };
    return Rect;
})(TypedReact.Component);
var Rect;
(function (Rect) {
    "use strict";
    Rect.Component = TypedReact.createClass(Rect, [PureRenderMixin]);
})(Rect || (Rect = {}));
module.exports = Rect;
