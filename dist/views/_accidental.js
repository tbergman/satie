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
var Glyph = require("./_glyph");
var Accidental = (function (_super) {
    __extends(Accidental, _super);
    function Accidental() {
        _super.apply(this, arguments);
    }
    Accidental.prototype.render = function () {
        var accidental = React.createElement(Glyph.Component, { x: this.props.x, y: this.props.y - (this.props.line - 3) * 10, fill: this.props.stroke, scale: this.props.grace ? 0.6 : 1.0, opacity: this.props.opacity, glyphName: this.props.accidental, "selection-info": "accidental-" + this.props.idx });
        if (this.props.paren) {
            var width = C.SMuFL.bravuraBBoxes[this.props.accidental][0] * 10;
            return React.createElement("g", null, React.createElement(Glyph.Component, { x: this.props.x - 7, y: this.props.y - (this.props.line - 3) * 10, glyphName: "accidentalParensLeft" }), accidental, React.createElement(Glyph.Component, { x: this.props.x + width, y: this.props.y - (this.props.line - 3) * 10, glyphName: "accidentalParensRight" }));
        }
        else {
            return accidental;
        }
    };
    return Accidental;
})(TypedReact.Component);
var Accidental;
(function (Accidental) {
    "use strict";
    Accidental.Component = TypedReact.createClass(Accidental, [PureRenderMixin]);
})(Accidental || (Accidental = {}));
module.exports = Accidental;
