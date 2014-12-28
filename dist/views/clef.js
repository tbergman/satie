var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var Glyph = require("./_glyph");
var PureModelViewMixin = require("./pureModelViewMixin");
var Clef = (function (_super) {
    __extends(Clef, _super);
    function Clef() {
        _super.apply(this, arguments);
    }
    Clef.prototype.render = function () {
        var spec = this.props.spec;
        var x = spec.x - (spec.isChange ? 0.2 : 0);
        var clef = React.createElement(Glyph.Component, { x: x, y: spec.y - (this.line() - 3) * 10, opacity: this.props.opacity, fill: spec.color, glyphName: this.sign() + (spec.isChange ? "Change" : "") });
        return clef;
    };
    Clef.prototype.sign = function () {
        var clef = this.props.spec.displayedClef;
        return clef.sign.toLowerCase() + "Clef";
    };
    Clef.prototype.line = function () {
        return this.props.spec.displayedClef.line;
    };
    return Clef;
})(TypedReact.Component);
;
var Clef;
(function (Clef) {
    "use strict";
    Clef.Component = TypedReact.createClass(Clef, [PureModelViewMixin]);
})(Clef || (Clef = {}));
module.exports = Clef;
