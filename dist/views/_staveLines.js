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
var Line = require("./_line");
var SMuFL = require("../util/SMuFL");
var StaveLines = (function (_super) {
    __extends(StaveLines, _super);
    function StaveLines() {
        _super.apply(this, arguments);
    }
    StaveLines.prototype.render = function () {
        var _this = this;
        return React.createElement("g", null, _.times(5, function (i) { return React.createElement(Line.Component, { key: "staff-" + i, x1: _this.props.x, x2: _this.props.x + _this.props.width, y1: _this.props.y - 10 * (i - 2), y2: _this.props.y - 10 * (i - 2), stroke: "#6A6A6A", victoriaXStrokeWidthFactor: 0, strokeWidth: SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness * 10 }); }));
    };
    return StaveLines;
})(TypedReact.Component);
var StaveLines;
(function (StaveLines) {
    "use strict";
    StaveLines.Component = TypedReact.createClass(StaveLines, [PureRenderMixin]);
})(StaveLines || (StaveLines = {}));
module.exports = StaveLines;
