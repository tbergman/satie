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
var getFontOffset = require("./_getFontOffset");
var stemThickness = C.SMuFL.bravuraMetadata.engravingDefaults.stemThickness * 10;
var NoteStem = (function (_super) {
    __extends(NoteStem, _super);
    function NoteStem() {
        _super.apply(this, arguments);
        this.getFontOffset = getFontOffset;
    }
    NoteStem.prototype.render = function () {
        var fontOffsetX = this.getFontOffset()[0] * (this.props.grace ? 0.6 : 1.0);
        var fontOffsetY = this.getFontOffset()[1];
        return React.createElement(Line.Component, { x1: this.props.x + fontOffsetX * 10 + this.lineXOffset(), x2: this.props.x + fontOffsetX * 10 + this.lineXOffset(), y1: this.props.y - fontOffsetY * 10 - (this.props.line - 3) * 10, y2: this.props.y - (this.props.line - 3) * 10 - fontOffsetY * 10 - this.direction() * this.height(), stroke: this.props.stroke, strokeWidth: stemThickness });
    };
    NoteStem.prototype.height = function () {
        return this.props.height;
    };
    NoteStem.prototype.direction = function () {
        return this.props.direction;
    };
    NoteStem.prototype.lineXOffset = function () {
        return this.direction() * -stemThickness / 2;
    };
    NoteStem.prototype.getDefaultProps = function () {
        return {
            x: 0,
            y: 0,
            height: 3.5,
            stroke: "#000000"
        };
    };
    return NoteStem;
})(TypedReact.Component);
var NoteStem;
(function (NoteStem) {
    "use strict";
    NoteStem.Component = TypedReact.createClass(NoteStem, [PureRenderMixin]);
})(NoteStem || (NoteStem = {}));
module.exports = NoteStem;
