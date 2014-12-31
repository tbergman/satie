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
        var height = (this.props.y2 - this.props.y) + 40;
        var bottom = this.props.y2 + 20;
        var s = height / 40;
        return React.createElement("g", null, React.createElement(Glyph.Component, { transform: "scale(" + s + "," + s + ")" + "translate(" + (-this.props.x * (1 - 1 / s)) + "," + -(1 - 1 / s) * bottom + ")", fill: "#000000", key: 0, x: this.props.x - 5, y: bottom, glyphName: "brace" }), React.createElement(Line.Component, { stroke: "black", strokeWidth: defaults.thinBarlineThickness * 10, key: 1, x1: this.props.x, x2: this.props.x, y1: this.props.y - 20, y2: this.props.y2 + 20 }));
    };
    return Brace;
})(TypedReact.Component);
var Brace;
(function (Brace) {
    "use strict";
    Brace.Component = TypedReact.createClass(Brace, [PureRenderMixin]);
})(Brace || (Brace = {}));
module.exports = Brace;
