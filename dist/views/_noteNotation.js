var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var C = require("../stores/contracts");
var Glyph = require("./_glyph");
var getFontOffset = require("./_getFontOffset");
var NoteNotation = (function (_super) {
    __extends(NoteNotation, _super);
    function NoteNotation() {
        _super.apply(this, arguments);
        this.getFontOffset = getFontOffset;
    }
    NoteNotation.prototype.render = function () {
        var offset = C.SMuFL.bravuraBBoxes[this.props.notehead][0];
        var start = C.SMuFL.bravuraBBoxes[this.props.notehead][3];
        var o2 = C.SMuFL.bravuraBBoxes[this.glyphName()][3];
        var s2 = C.SMuFL.bravuraBBoxes[this.glyphName()][0];
        return React.createElement(Glyph.Component, { x: this.props.x + this.xOffset() + (offset - start) / 4 / 2 + (o2 - s2) / 4 / 2, y: this.props.y - this.yOffset(), fill: this.glyphIsTemporary() ? "#A5A5A5" : "#000000", glyphName: this.glyphName(), glyphIsTemporary: this.glyphIsTemporary() });
    };
    NoteNotation.prototype.directionString = function () {
        if (C.SMuFL.bravuraBBoxes[this.notationName()]) {
            return "";
        }
        else if (this.direction() === 1) {
            return "Below";
        }
        else if (this.direction() === -1) {
            return "Above";
        }
    };
    NoteNotation.prototype.shouldBeAboveStaff = function () {
        var above = ["fermata", "breathMark", "caesura", "strings"];
        for (var i = 0; i < above.length; ++i) {
            if (this.notationName().indexOf(above[i]) === 0) {
                return true;
            }
        }
        return false;
    };
    NoteNotation.prototype.shouldBeBelowStaff = function () {
        var below = ["dynamic"];
        for (var i = 0; i < below.length; ++i) {
            if (this.notationName().indexOf(below[i]) === 0) {
                return true;
            }
        }
        return false;
    };
    NoteNotation.prototype.glyphIsTemporary = function () {
        return false;
    };
    NoteNotation.prototype.glyphName = function () {
        return this.notationName() + this.directionString();
    };
    NoteNotation.prototype.notationName = function () {
        return "";
    };
    NoteNotation.prototype.direction = function () {
        if (this.shouldBeAboveStaff()) {
            return -1;
        }
        return this.props.direction;
    };
    NoteNotation.prototype.xOffset = function () {
        return 0;
    };
    NoteNotation.prototype.yOffset = function () {
        var m;
        if (this.shouldBeAboveStaff()) {
            m = (6.0 + this.props.idx - 3) / 4;
            if (m + 1.5 <= this.props.line / 4) {
                m = (this.props.line) / 4 + 1.5;
            }
            return m;
        }
        else if (this.shouldBeBelowStaff()) {
            m = (-1.5 + this.props.idx - 3) / 4;
            if (m + 1.5 >= this.props.line / 4) {
                m = (this.props.line) / 4 - 1.5;
            }
            return m;
        }
        if (this.direction() === 1) {
            return (this.props.line - 1.2 - (this.props.line % 1 && this.props.line - 1.2 > 0 ? 0.4 : 0) - this.props.idx - 3) / 4;
        }
        return (this.props.line + 1.2 + (this.props.line % 1 && this.props.line + 1.2 < 5 ? 0.4 : 0) + this.props.idx - 3) / 4;
    };
    return NoteNotation;
})(TypedReact.Component);
var NoteNotation;
(function (NoteNotation) {
    "use strict";
    NoteNotation.Component = TypedReact.createClass(NoteNotation, [PureRenderMixin]);
})(NoteNotation || (NoteNotation = {}));
module.exports = NoteNotation;
