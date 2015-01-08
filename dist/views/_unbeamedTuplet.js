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
var getFontOffset = require("./_getFontOffset");
var UnbeamedTuplet = (function (_super) {
    __extends(UnbeamedTuplet, _super);
    function UnbeamedTuplet() {
        _super.apply(this, arguments);
        this.getFontOffset = getFontOffset;
    }
    UnbeamedTuplet.prototype.render = function () {
        return React.DOM.g(null, React.DOM.polygon({
            key: "p1",
            points: this._getX1() + "," + this._getY1(0) + " " + this._getX2() + "," + this._getY2(0) + " " + this._getX2() + "," + this._getY2(1) + " " + this._getX1() + "," + this._getY1(1),
            stroke: this.props.stroke,
            fill: this.props.stroke,
            strokeWidth: 0
        }), React.DOM.line({
            key: "p2",
            x1: this._getX1(),
            x2: this._getX1(),
            y1: this._getY1(this.props.direction === -1 ? 1 : 0),
            y2: this._getY1(this.props.direction === -1 ? 0 : 1) + 4 * this.props.direction,
            stroke: this.props.stroke,
            fill: this.props.stroke,
            strokeWidth: C.SMuFL.bravuraMetadata.engravingDefaults.tupletBracketThickness * 10
        }), React.DOM.line({
            key: "p3",
            x1: this._getX2(),
            x2: this._getX2(),
            y1: this._getY2(this.props.direction === -1 ? 1 : 0),
            y2: this._getY2(this.props.direction === -1 ? 0 : 1) + 4 * this.props.direction,
            stroke: this.props.stroke,
            fill: this.props.stroke,
            strokeWidth: C.SMuFL.bravuraMetadata.engravingDefaults.tupletBracketThickness * 10
        }), this._tuplet());
    };
    UnbeamedTuplet.prototype.getLineXOffset = function () {
        return this.direction() * -this.props.stemWidth / 2;
    };
    UnbeamedTuplet.prototype.direction = function () {
        return this.props.direction;
    };
    UnbeamedTuplet.prototype._withXOffset = function (x) {
        return x + this.getFontOffset("noteheadBlack")[0] * 10 + this.getLineXOffset();
    };
    UnbeamedTuplet.prototype._getX1 = function () {
        return this._withXOffset(this.props.x);
    };
    UnbeamedTuplet.prototype._getX2 = function () {
        return this._withXOffset(this.props.x + this.props.width);
    };
    UnbeamedTuplet.prototype._getY1 = function (incl) {
        return this.props.y - this._getYOffset() - this.direction() * this.getFontOffset("noteheadBlack")[1] * 10 - (this.props.line1 - 3) * 10 + (incl || 0) * (C.SMuFL.bravuraMetadata.engravingDefaults.tupletBracketThickness * 10);
    };
    UnbeamedTuplet.prototype._getY2 = function (incl) {
        return this.props.y - this._getYOffset() - this.direction() * this.getFontOffset("noteheadBlack")[1] * 10 - (this.props.line2 - 3) * 10 + (incl || 0) * (C.SMuFL.bravuraMetadata.engravingDefaults.tupletBracketThickness * 10);
    };
    UnbeamedTuplet.prototype._getYOffset = function () {
        if (this.direction() === -1) {
            return 1;
        }
        return 0.2;
    };
    UnbeamedTuplet.prototype._tuplet = function () {
        if (!this.props.tuplet) {
            return null;
        }
        else {
            var symbol = "tuplet" + (this.props.tuplet.actualNotes.count.toString()[0]);
            var bbox = C.SMuFL.bravuraBBoxes[symbol];
            var offset = (this._getX2() - this._getX1()) / 2 - this.props.direction * (bbox[2] - bbox[0]) * 10 / 2;
            var y = (this._getY1(1) + this._getY2(1)) / 2 + 5.8;
            return React.createElement("g", null, React.createElement("polygon", { stroke: "white", fill: "white", strokeWidth: 0, points: (this.props.x + offset - bbox[0] * 10 + 4) + "," + (y - bbox[1] * 10) + " " + (this.props.x + offset - bbox[0] * 10 + 4) + "," + (y + bbox[3] * 10) + " " + (this.props.x + offset + bbox[1] * 10 + 4) + "," + (y + bbox[3] * 10) + " " + (this.props.x + offset + bbox[1] * 10 + 4) + "," + (y - bbox[1] * 10) }), React.createElement(Glyph.Component, { "selection-info": "beamTuplet", fill: this.props.tupletsTemporary ? "#A5A5A5" : "#000000", glyphName: symbol, x: this.props.x + offset, y: y }));
        }
    };
    return UnbeamedTuplet;
})(TypedReact.Component);
;
var UnbeamedTuplet;
(function (UnbeamedTuplet) {
    "use strict";
    UnbeamedTuplet.Component = TypedReact.createClass(UnbeamedTuplet, [PureRenderMixin]);
})(UnbeamedTuplet || (UnbeamedTuplet = {}));
module.exports = UnbeamedTuplet;
