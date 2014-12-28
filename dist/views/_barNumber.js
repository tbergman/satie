var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var BarNumber = (function (_super) {
    __extends(BarNumber, _super);
    function BarNumber() {
        _super.apply(this, arguments);
    }
    BarNumber.prototype.render = function () {
        return React.createElement("text", { x: this.props.x, y: this.props.y, fontSize: 24, className: "bn_" }, this.props.barNumber);
    };
    return BarNumber;
})(TypedReact.Component);
;
var BarNumber;
(function (BarNumber) {
    "use strict";
    BarNumber.Component = TypedReact.createClass(BarNumber, [PureRenderMixin]);
})(BarNumber || (BarNumber = {}));
module.exports = BarNumber;
