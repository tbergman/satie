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
        var lyKey = 0;
        var lyrics = _.chain(spec._notes).map(function (n) { return n.lyrics; }).filter(function (l) { return !!l; }).flatten(true).filter(function (l) { return !!l; }).map(function (l) {
            var text = [];
            var currSyllabic = 0 /* Single */;
            for (var i = 0; i < l.lyricParts.length; ++i) {
                switch (l.lyricParts[i]._class) {
                    case "Syllabic":
                        var syllabic = l.lyricParts[i];
                        currSyllabic = syllabic.data;
                        break;
                    case "Text":
                        var textPt = l.lyricParts[i];
                        var width = C.SMuFL.bravuraBBoxes[props.spec.noteheadGlyph][0] * 10;
                        text.push(React.createElement("text", { textAnchor: "middle", fontSize: textPt.fontSize || "22", key: ++lyKey, x: width / 2 + (zeroOffsetMode ? 0 : spec.x), y: 60 + (zeroOffsetMode ? 0 : spec.y) }, textPt.data));
                }
            }
            ;
            return text;
        }).flatten().value();
        if (spec.isRest) {
            return React.createElement(Rest.Component, { dotted: spec.displayDots, line: spec.lines, key: spec.key, isNote: true, notehead: spec.restHead, multiRest: spec.multiRest, spacing: spec.spacing, stroke: spec.color, x: spec.x, y: spec.y }, notations);
        }
        assert(spec.count);
        var note = React.createElement(Note.Component, { accidentals: spec._displayedAccidentals, accStrokes: spec.accStrokes, direction: this.props.direction || spec.direction, dotted: spec.displayDots, flag: spec.flag, hasStem: spec.hasStem, isNote: true, key: spec.key, lyrics: lyrics, line: spec.lines, notehead: spec.noteheadGlyph, secondaryStroke: spec.color, stemHeight: this.props.stemHeight, strokes: spec.strokes, tieTo: spec.tieTo && spec.tieTo.x, x: zeroOffsetMode ? 0 : spec.x, y: zeroOffsetMode ? 0 : spec.y }, notations);
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
