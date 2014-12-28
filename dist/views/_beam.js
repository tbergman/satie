var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var _ = require("lodash");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var C = require("../stores/contracts");
var Glyph = require("./_glyph");
var getFontOffset = require("./_getFontOffset");
var Beam = (function (_super) {
    __extends(Beam, _super);
    function Beam() {
        _super.apply(this, arguments);
        this.getFontOffset = getFontOffset;
    }
    Beam.prototype.render = function () {
        var _this = this;
        if (this.props.beams === -1 /* Variable */) {
            var xLow = this._getX1();
            var xHi = this._getX2();
            return React.createElement("g", null, _.map(this.props.variableBeams, function (beams, idx) {
                if (idx === 0) {
                    return null;
                }
                return _.times(beams, function (beam) {
                    var x1;
                    var x2 = _this._withXOffset(_this.props.variableX[idx]);
                    if (_this.props.variableBeams[idx - 1] <= beam) {
                        if (_this.props.variableX[idx + 1] && _this.props.variableBeams[idx + 1] === beams) {
                            return null;
                        }
                        x1 = _this._withXOffset((_this.props.variableX[idx - 1] + _this.props.variableX[idx] * 3) * 10);
                    }
                    else {
                        x1 = _this._withXOffset(_this.props.variableX[idx - 1]);
                    }
                    return React.DOM.polygon({
                        key: idx + "_" + beam,
                        points: x1 + "," + _this._getYVar(0, beam, (x1 - xLow) / (xHi - xLow)) + " " + x2 + "," + _this._getYVar(0, beam, (x2 - xLow) / (xHi - xLow)) + " " + x2 + "," + _this._getYVar(1, beam, (x2 - xLow) / (xHi - xLow)) + " " + x1 + "," + _this._getYVar(1, beam, (x1 - xLow) / (xHi - xLow)),
                        stroke: _this.props.stroke,
                        fill: _this.props.stroke,
                        strokeWidth: 0
                    });
                });
            }), this._tuplet());
        }
        else {
            return React.createElement("g", null, _.times(this.props.beams, function (idx) { return React.DOM.polygon({
                key: "" + idx,
                points: _this._getX1() + "," + _this._getY1(0, idx) + " " + _this._getX2() + "," + _this._getY2(0, idx) + " " + _this._getX2() + "," + _this._getY2(1, idx) + " " + _this._getX1() + "," + _this._getY1(1, idx),
                stroke: _this.props.stroke,
                fill: _this.props.stroke,
                strokeWidth: 0
            }); }), this._tuplet());
        }
    };
    Beam.prototype.getLineXOffset = function () {
        return this.direction() * -this.props.stemWidth / 2;
    };
    Beam.prototype.direction = function () {
        return this.props.direction;
    };
    Beam.prototype._withXOffset = function (x) {
        return x + this.getFontOffset("noteheadBlack")[0] * 10 + this.getLineXOffset();
    };
    Beam.prototype._getX1 = function () {
        return this._withXOffset(this.props.x);
    };
    Beam.prototype._getX2 = function () {
        return this._withXOffset(this.props.x + this.props.width);
    };
    Beam.prototype._getY1 = function (incl, idx) {
        return this.props.y - this._getYOffset() - this.direction() * this.getFontOffset("noteheadBlack")[1] * 10 - (this.props.line1 - 3) * 10 + this.direction() * idx * 8.8 + (incl || 0) * (C.SMuFL.bravuraMetadata.engravingDefaults.beamThickness * 10);
    };
    Beam.prototype._getY2 = function (incl, idx) {
        return this.props.y - this._getYOffset() - this.direction() * this.getFontOffset("noteheadBlack")[1] * 10 - (this.props.line2 - 3) * 10 + this.direction() * idx * 8.8 + (incl || 0) * (C.SMuFL.bravuraMetadata.engravingDefaults.beamThickness * 10);
    };
    Beam.prototype._getYVar = function (incl, idx, percent) {
        var y1 = this._getY1(incl, idx);
        var y2 = this._getY2(incl, idx);
        return (1 - percent) * y1 + percent * y2;
    };
    Beam.prototype._getYOffset = function () {
        if (this.direction() === -1) {
            return 1;
        }
        return 0.2;
    };
    Beam.prototype._tuplet = function () {
        if (!this.props.tuplet) {
            return null;
        }
        else {
            var offset = this._getX2() - this._getX1();
            var y = (this._getY1(1, this.props.beams - 1) + this._getY2(1, this.props.beams - 1)) / 2 - (4 + 8 * this.props.beams) * this.direction() + 5.2;
            return React.createElement(Glyph.Component, { "selection-info": "beamTuplet", fill: this.props.tupletsTemporary ? "#A5A5A5" : "#000000", glyphName: "tuplet3", x: this.props.x + offset / 2, y: y });
        }
    };
    return Beam;
})(TypedReact.Component);
;
var Beam;
(function (Beam) {
    "use strict";
    Beam.Component = TypedReact.createClass(Beam, [PureRenderMixin]);
})(Beam || (Beam = {}));
module.exports = Beam;
