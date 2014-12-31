var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var Brace = require("./_brace");
var PureModelViewMixin = require("./pureModelViewMixin");
var StaveLines = require("./_staveLines");
var BeginView = (function (_super) {
    __extends(BeginView, _super);
    function BeginView() {
        _super.apply(this, arguments);
    }
    BeginView.prototype.render = function () {
        var spec = this.props.spec;
        return React.createElement("g", null, React.createElement(StaveLines.Component, { key: "StaveLines", width: this.props.spec.staveW, x: spec.x, y: spec.braceY }), spec.startOfSystem && React.createElement(Brace.Component, { idx: 1, x: spec.x, y: spec.braceY, y2: spec.braceY2 }));
    };
    return BeginView;
})(TypedReact.Component);
;
var BeginView;
(function (BeginView) {
    "use strict";
    BeginView.Component = TypedReact.createClass(BeginView, [PureModelViewMixin]);
})(BeginView || (BeginView = {}));
module.exports = BeginView;
