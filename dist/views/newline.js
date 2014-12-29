var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureModelViewMixin = require("./pureModelViewMixin");
var StaveLines = require("./_staveLines");
var BarNumber = require("./_barNumber");
var NewlineView = (function (_super) {
    __extends(NewlineView, _super);
    function NewlineView() {
        _super.apply(this, arguments);
    }
    NewlineView.prototype.render = function () {
        var spec = this.props.spec;
        var barNumber = spec.ctxData.bar + "";
        return React.createElement("g", null, React.createElement(StaveLines.Component, { key: "StaveLines", width: this.props.spec.staveW, x: spec.x, y: spec.braceY + spec.lineSpacing }), React.createElement(BarNumber.Component, { x: spec.x - 0, y: spec.braceY + spec.lineSpacing - 30, barNumber: barNumber }));
    };
    return NewlineView;
})(TypedReact.Component);
;
var NewlineView;
(function (NewlineView) {
    "use strict";
    NewlineView.Component = TypedReact.createClass(NewlineView, [PureModelViewMixin]);
})(NewlineView || (NewlineView = {}));
module.exports = NewlineView;
