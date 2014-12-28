var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var assert = require("assert");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Glyph = require("./_glyph");
var getFontOffset = require("./_getFontOffset");
var Flag = (function (_super) {
    __extends(Flag, _super);
    function Flag() {
        _super.apply(this, arguments);
        this.getFontOffset = getFontOffset;
    }
    Flag.prototype.render = function () {
        var fontOffset = this.getFontOffset(this.glyphName());
        var noteOffset = this.getFontOffset();
        return React.createElement(Glyph.Component, { x: this.props.x + fontOffset[0] * 10 + ((this.props.direction === 1) ? noteOffset[0] * 10 - this.props.stemWidth : 0), y: this.props.y - (this.props.line - 3) * 10 - noteOffset[1] * 10 - this.direction() * this.props.stemHeight, fill: this.props.stroke, glyphName: this.glyphName() });
    };
    Flag.prototype.directionString = function () {
        if (this.direction() === 1) {
            return "Up";
        }
        else if (this.direction() === -1) {
            return "Down";
        }
        assert(false, "Invalid direction");
    };
    Flag.prototype.direction = function () {
        return this.props.direction;
    };
    Flag.prototype.glyphName = function () {
        return this.props.flag + this.directionString();
    };
    Flag.prototype.getDefaultProps = function () {
        return {
            x: 0,
            y: 0,
            line: 3
        };
    };
    return Flag;
})(TypedReact.Component);
var Flag;
(function (Flag) {
    "use strict";
    Flag.Component = TypedReact.createClass(Flag, [PureRenderMixin]);
    ;
})(Flag || (Flag = {}));
module.exports = Flag;
