var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Line = (function (_super) {
    __extends(Line, _super);
    function Line() {
        _super.apply(this, arguments);
    }
    Line.prototype.render = function () {
        return React.DOM.line({
            className: this.props.className,
            x1: (this.props.x1),
            x2: (this.props.x2),
            y1: (this.props.y1),
            y2: (this.props.y2),
            stroke: this.props.stroke,
            strokeWidth: (this.props.strokeWidth)
        });
    };
    return Line;
})(TypedReact.Component);
var Line;
(function (Line) {
    "use strict";
    Line.Component = TypedReact.createClass(Line, [PureRenderMixin]);
})(Line || (Line = {}));
module.exports = Line;
