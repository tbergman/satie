var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var React = require("react");
var TypedReact = require("typed-react");
var _ = require("lodash");
var assert = require("assert");
var C = require("../stores/contracts");
var DurationModel = require("../stores/duration");
var Note = require("./_note");
var NoteNotation = require("./_noteNotation");
var PureModelViewMixin = require("./pureModelViewMixin");
var Rest = require("./_rest");
var Duration = (function (_super) {
    __extends(Duration, _super);
    function Duration() {
        _super.apply(this, arguments);
    }
    Duration.prototype.render = function () {
        var props = this.props;
        var spec = props.spec;
        assert(spec instanceof DurationModel);
        var notations = _.map(spec.displayNotation || [], function (m, idx) { return React.createElement(NoteNotation.Component, { idx: 1, direction: props.direction, notation: m, key: idx, line: 3, notehead: props.spec.noteheadGlyph, x: NaN, y: NaN }); });
        var zeroOffsetMode = !C.renderUtil.useGL && !spec.isRest && !spec.tie;
        if (spec.isRest) {
            return React.createElement(Rest.Component, { dotted: spec.displayDots, line: [3], key: spec.key, isNote: true, notehead: spec.restHead, spacing: spec.spacing, stroke: spec.color, x: spec.x, y: spec.y }, notations);
        }
        assert(spec.count);
        var note = React.createElement(Note.Component, { accidentals: spec._displayedAccidentals, accStrokes: spec.accStrokes, direction: this.props.direction || spec.direction, dotted: spec.displayDots, flag: spec.flag, hasStem: spec.hasStem, isNote: true, key: spec.key, line: spec.lines, notehead: spec.noteheadGlyph, secondaryStroke: spec.color, stemHeight: this.props.stemHeight, strokes: spec.strokes, tieTo: spec.tieTo && spec.tieTo.x, x: zeroOffsetMode ? 0 : spec.x, y: zeroOffsetMode ? 0 : spec.y }, notations);
        if (zeroOffsetMode) {
            return React.createElement("g", { key: spec.key, x: spec.x, y: spec.y, transform: "translate(" + spec.x + "," + spec.y + ")" }, note);
        }
        else {
            return note;
        }
    };
    return Duration;
})(TypedReact.Component);
var Duration;
(function (Duration) {
    Duration.Component = TypedReact.createClass(Duration, [PureModelViewMixin]);
})(Duration || (Duration = {}));
module.exports = Duration;
