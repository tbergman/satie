var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var C = require("../stores/contracts");
var Line = require("./_line");
var LedgerLine = (function (_super) {
    __extends(LedgerLine, _super);
    function LedgerLine() {
        _super.apply(this, arguments);
    }
    LedgerLine.prototype.render = function () {
        var west = C.SMuFL.bravuraBBoxes[this.props.notehead][3];
        var east = C.SMuFL.bravuraBBoxes[this.props.notehead][0];
        var xOffset = (east - west) * 10;
        return React.createElement(Line.Component, { x1: this.props.x - 3.2, x2: this.props.x + xOffset - 0.2, y1: this.props.y - (this.props.line - 3) * 10, y2: this.props.y - (this.props.line - 3) * 10, victoriaXStrokeWidthFactor: 0, stroke: "#000000", strokeWidth: 2.2 });
    };
    return LedgerLine;
})(TypedReact.Component);
var LedgerLine;
(function (LedgerLine) {
    "use strict";
    LedgerLine.Component = TypedReact.createClass(LedgerLine, [PureRenderMixin]);
})(LedgerLine || (LedgerLine = {}));
module.exports = LedgerLine;
