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
var Glyph = require("./_glyph");
var PureModelViewMixin = require("./pureModelViewMixin");
var TimeSignature = (function (_super) {
    __extends(TimeSignature, _super);
    function TimeSignature() {
        _super.apply(this, arguments);
    }
    TimeSignature.prototype.render = function () {
        var spec = this.props.spec;
        var ts = spec.displayTimeSignature;
        if (ts.commonRepresentation) {
            var beats = ts.beats;
            var beatType = ts.beatType;
            if (beats === 4 && beatType === 4) {
                return React.createElement(Glyph.Component, { x: spec.x, y: spec.y, fill: spec.color, glyphName: "timeSigCommon" });
            }
            else if (beats === 2 && beatType === 2) {
                return React.createElement(Glyph.Component, { x: spec.x, y: spec.y, fill: spec.color, glyphName: "timeSigCutCommon" });
            }
        }
        return React.createElement("g", null, React.createElement(TimeSignatureNumber.Component, { key: "-5", stroke: spec.color, x: spec.x + this.numOffset(), y: spec.y - 10 }, ts.beats), React.createElement(TimeSignatureNumber.Component, { key: "-6", stroke: spec.color, x: spec.x + this.denOffset(), y: spec.y + 10 }, ts.beatType));
    };
    TimeSignature.prototype.numOffset = function () {
        var ts = this.props.spec.displayTimeSignature;
        if (ts.beats < 10 && ts.beatType >= 10) {
            return 5;
        }
        return 0;
    };
    TimeSignature.prototype.denOffset = function () {
        var ts = this.props.spec.displayTimeSignature;
        if (ts.beatType < 10 && ts.beats >= 10) {
            return 5;
        }
        return 0;
    };
    return TimeSignature;
})(TypedReact.Component);
;
var TimeSignature;
(function (TimeSignature) {
    "use strict";
    TimeSignature.Component = TypedReact.createClass(TimeSignature, [PureModelViewMixin]);
})(TimeSignature || (TimeSignature = {}));
var TimeSignatureNumber = (function (_super) {
    __extends(TimeSignatureNumber, _super);
    function TimeSignatureNumber() {
        _super.apply(this, arguments);
    }
    TimeSignatureNumber.prototype.render = function () {
        var _this = this;
        return React.createElement("g", null, _.map((this.props.children + "").split(""), function (c, i) { return React.createElement(Glyph.Component, { key: "ts-" + i, x: _this.props.x + i * 12, y: _this.props.y, fill: _this.props.stroke, glyphName: "timeSig" + c }); }));
    };
    return TimeSignatureNumber;
})(TypedReact.Component);
var TimeSignatureNumber;
(function (TimeSignatureNumber) {
    TimeSignatureNumber.Component = TypedReact.createClass(TimeSignatureNumber, [PureRenderMixin]);
})(TimeSignatureNumber || (TimeSignatureNumber = {}));
module.exports = TimeSignature;
