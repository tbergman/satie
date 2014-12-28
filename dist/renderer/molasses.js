var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var Molasses = (function (_super) {
    __extends(Molasses, _super);
    function Molasses() {
        _super.apply(this, arguments);
    }
    Molasses.prototype.render = function () {
        return React.DOM.svg({
            "data-page": this.props.page.idx,
            height: this.props.height,
            onClick: this.props.onClick,
            onMouseDown: this.props.onMouseDown,
            onMouseLeave: this.props.onMouseLeave,
            onMouseMove: this.props.onMouseMove,
            onMouseUp: this.props.onMouseUp,
            ref: "svg" + this.props.page.idx,
            viewBox: this.props.viewbox,
            width: this.props.width
        }, this.props.children);
    };
    return Molasses;
})(TypedReact.Component);
;
var Molasses;
(function (Molasses) {
    "use strict";
    Molasses.Component = TypedReact.createClass(Molasses);
})(Molasses || (Molasses = {}));
module.exports = Molasses;
