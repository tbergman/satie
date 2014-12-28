var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var Glyph = require("./_glyph");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Accidental = (function (_super) {
    __extends(Accidental, _super);
    function Accidental() {
        _super.apply(this, arguments);
    }
    Accidental.prototype.render = function () {
        return React.createElement(Glyph.Component, { x: this.props.x, y: this.props.y - (this.props.line - 3) * 10, fill: this.props.stroke, opacity: this.props.opacity, glyphName: this.props.accidental, "selection-info": "accidental-" + this.props.idx });
    };
    return Accidental;
})(TypedReact.Component);
var Accidental;
(function (Accidental) {
    "use strict";
    Accidental.Component = TypedReact.createClass(Accidental, [PureRenderMixin]);
})(Accidental || (Accidental = {}));
module.exports = Accidental;
