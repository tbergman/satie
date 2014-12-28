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
var Glyph = require("./_glyph");
var Brace = (function (_super) {
    __extends(Brace, _super);
    function Brace() {
        _super.apply(this, arguments);
    }
    Brace.prototype.render = function () {
        var defaults = C.SMuFL.bravuraMetadata.engravingDefaults;
        var height = (this.props.y2 - this.props.y) + 1;
        var mid = (this.props.y2 + this.props.y) / 2;
        var s = height;
        return React.createElement("g", null, React.createElement(Glyph.Component, { transform: "scale(" + s + "," + s + ")" + "translate(" + (-this.props.fontSize * this.props.x * (1 - 1 / s)) + "," + -(1 - 1 / s) * this.props.fontSize * mid + ")", fill: "#000000", fontSize: this.props.fontSize, key: 0, x: this.props.x - 1 / 8, y: mid + 2 / 4, glyphName: "brace" }), React.createElement(Line.Component, { stroke: "black", strokeWidth: defaults.thinBarlineThickness / 4, fontSize: this.props.fontSize, key: 1, x1: this.props.x, x2: this.props.x, y1: mid - height / 2, y2: mid + height / 2 }));
    };
    return Brace;
})(TypedReact.Component);
var Brace;
(function (Brace) {
    "use strict";
    Brace.Component = TypedReact.createClass(Brace, [PureRenderMixin]);
})(Brace || (Brace = {}));
module.exports = Brace;
