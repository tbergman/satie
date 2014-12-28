var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var assert = require("assert");
var Bezier = require("./_bezier");
var Note = require("./_note");
var PureModelViewMixin = require("./pureModelViewMixin");
var getExtremeLine = Note.getExtremeLine;
var Slur = (function (_super) {
    __extends(Slur, _super);
    function Slur() {
        _super.apply(this, arguments);
    }
    Slur.prototype.render = function () {
        var x2 = this.getX2();
        var x1 = this.getX1();
        var y2 = this.getY2(0);
        var y1 = this.getY1(0);
        var dir = this.direction();
        var x2mx1 = x2 - x1;
        var x1mx2 = -x2mx1;
        var relw = 3.2;
        var y1my2 = y1 - y2;
        var absw = -dir * 8.321228 / Math.max(1, (Math.abs(y1my2)));
        if ((y1my2 > 0 ? -1 : 1) * dir === 1) {
            absw = absw * 2;
        }
        assert(!isNaN(x2));
        assert(!isNaN(x1));
        assert(!isNaN(y2));
        assert(!isNaN(y1));
        assert(!isNaN(dir));
        assert(!isNaN(x2mx1));
        assert(!isNaN(x1mx2));
        assert(!isNaN(relw));
        assert(!isNaN(y1my2));
        assert(!isNaN(absw));
        return React.createElement(Bezier.Component, { x1: x2, y1: y2, x2: 0.28278198 / 1.23897534 * x1mx2 + x2, y2: ((dir === -1 ? y1my2 : 0) + absw) + y2, x3: 0.9561935 / 1.23897534 * x1mx2 + x2, y3: ((dir === -1 ? y1my2 : 0) + absw) + y2, x4: x1, y4: y1, x5: 0.28278198 / 1.23897534 * x2mx1 + x1, y5: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1, x6: 0.95619358 / 1.23897534 * x2mx1 + x1, y6: ((dir === -1 ? 0 : -y1my2) + absw + relw) + y1, fill: "#000000", strokeWidth: 1.2, stroke: "#000000" });
    };
    Slur.prototype.getYOffset = function () {
        if (this.direction() === -1) {
            return -10;
        }
        return 10;
    };
    Slur.prototype.direction = function () {
        return this.props.spec.direction;
    };
    Slur.prototype.getX1 = function () {
        return this.props.spec.x;
    };
    Slur.prototype.getX2 = function () {
        return this.props.spec.x + this.props.spec.width;
    };
    Slur.prototype.getY1 = function (idx) {
        return this.props.spec.y - this.getYOffset() - (getExtremeLine(this.props.spec.lines1, -this.direction) - 3) * 10;
    };
    Slur.prototype.getY2 = function (idx) {
        return this.props.spec.y - this.getYOffset() - (getExtremeLine(this.props.spec.lines2, -this.direction) - 3) * 10;
    };
    return Slur;
})(TypedReact.Component);
var Slur;
(function (Slur) {
    "use strict";
    Slur.Component = TypedReact.createClass(Slur, [PureModelViewMixin]);
})(Slur || (Slur = {}));
module.exports = Slur;
