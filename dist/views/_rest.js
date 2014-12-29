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
var Dot = require("./_dot");
var Glyph = require("./_glyph");
var Rest = (function (_super) {
    __extends(Rest, _super);
    function Rest() {
        _super.apply(this, arguments);
    }
    Rest.prototype.render = function () {
        var _this = this;
        var line = this.props.line[0];
        var width = C.SMuFL.bravuraBBoxes[this.props.notehead][0] * 10;
        return React.createElement("g", null, React.createElement(Glyph.Component, { key: "R", x: this.props.x + this.props.spacing, y: this.props.y + (3 - line) * 10, fill: this.props.stroke, glyphName: this.props.notehead }), this.props.multiRest && React.createElement("text", { x: this.props.x + this.props.spacing + width / 2, y: this.props.y - 30, fontSize: 48, className: "mmn_", textAnchor: "middle", line: line }, this.props.multiRest), this.props.dotted ? _.times(this.props.dotted, function (idx) { return React.createElement(Dot.Component, { idx: idx, key: idx + "d", radius: 2.4, stroke: _this.props.stroke, x: _this.props.x + _this.props.spacing, y: _this.props.y, line: line }); }) : null, this.props.children && _.map(this.props.children, function (element, idx) {
            element.props.direction = _this.direction();
            element.props.line = _this.startingLine();
            element.props.x = _this.props.x;
            element.props.y = _this.props.y;
            element.props.idx = idx;
            element.props.notehead = _this.props.notehead;
            return element;
        }));
    };
    Rest.prototype.direction = function () {
        return 1;
    };
    Rest.prototype.startingLine = function () {
        return this.props.line[0];
    };
    return Rest;
})(TypedReact.Component);
var Rest;
(function (Rest) {
    "use strict";
    Rest.Component = TypedReact.createClass(Rest, [PureRenderMixin]);
})(Rest || (Rest = {}));
module.exports = Rest;
