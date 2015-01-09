var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Glyph = require("./_glyph");
var NoteHead = (function (_super) {
    __extends(NoteHead, _super);
    function NoteHead() {
        _super.apply(this, arguments);
    }
    NoteHead.prototype.render = function () {
        return React.createElement(Glyph.Component, { x: this.props.x, y: this.props.y - (this.props.line - 3) * 10, fill: this.props.stroke, scale: this.props.grace ? 0.6 : 1.0, glyphName: this.props.notehead });
    };
    NoteHead.prototype.getDefaultProps = function () {
        return {
            x: 0,
            y: 0,
            line: 3
        };
    };
    return NoteHead;
})(TypedReact.Component);
var NoteHead;
(function (NoteHead) {
    "use strict";
    NoteHead.Component = TypedReact.createClass(NoteHead, [PureRenderMixin]);
})(NoteHead || (NoteHead = {}));
module.exports = NoteHead;
