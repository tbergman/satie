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
var PureModelViewMixin = require("./pureModelViewMixin");
var Rest = require("./_rest");
var UnbeamedTuplet = require("./_unbeamedTuplet");
var Duration = (function (_super) {
    __extends(Duration, _super);
    function Duration() {
        _super.apply(this, arguments);
    }
    Duration.prototype.render = function () {
        var props = this.props;
        var spec = props.spec;
        assert(spec instanceof DurationModel);
        var notations = spec.continuingNotations.map(this._mapContinuingNotation).filter(function (n) { return !!n; });
        var zeroOffsetMode = !C.renderUtil.useGL && !spec.isRest && !_.any(spec.tieds, function (t) { return t && t.type !== 1 /* Stop */; });
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
        var dotOffset = C.SMuFL.bravuraBBoxes[props.spec.noteheadGlyph || spec.restHead][0] * 10 + 6;
        if (spec.isRest) {
            return React.createElement(Rest.Component, { dotOffset: dotOffset, dotted: spec.displayDots, line: spec.lines, key: spec.key, isNote: true, notehead: spec.restHead, multiRest: spec.multiRest, spacing: spec.spacing, stroke: spec.color, x: spec.x, y: spec.y }, notations);
        }
        var note = React.createElement(Note.Component, { accidentals: spec._displayedAccidentals, accStrokes: spec.accStrokes, direction: this.props.direction || spec.direction, dotOffset: dotOffset, dotted: spec.displayDots, flag: spec.flag, hasStem: spec.hasStem, isNote: true, onLedger: spec.onLedger, lowestLine: spec.lowestLine, grace: _.map(spec._notes, function (n) { return n.grace; }), highestLine: spec.highestLine, startingLine: spec.startingLine, key: spec.key, lyrics: lyrics, lines: spec.lines, notehead: spec.noteheadGlyph, secondaryStroke: spec.color, stemHeight: this.props.spec.stemHeight || this.props.stemHeight, strokes: spec.strokes, tieTo: spec.tieTo && spec.tieTo.x, x: zeroOffsetMode ? 0 : spec.x, y: zeroOffsetMode ? 0 : spec.y }, notations);
        if (zeroOffsetMode) {
            return React.createElement("g", { key: spec.key, x: spec.x, y: spec.y, transform: "translate(" + spec.x + "," + spec.y + ")" }, note);
        }
        else {
            return note;
        }
    };
    Duration.prototype._mapContinuingNotation = function (m, idx) {
        switch (m.type) {
            case "tuplet":
                var d = m.getDirection();
                var first = m.body[0];
                var last = m.body[m.body.length - 1];
                var offset = 5.0 * d;
                var line1 = (d === -1 ? first.lowestLine + d * first.stemHeight / 40 : first.highestLine + d * first.stemHeight / 40);
                var line2 = (d === -1 ? last.lowestLine + d * last.stemHeight / 40 : last.highestLine + d * last.stemHeight / 40);
                line1 = d === -1 ? Math.min(line1, 4) : Math.max(line1, 1);
                line2 = d === -1 ? Math.min(line2, 4) : Math.max(line2, 1);
                return React.createElement(UnbeamedTuplet.Component, {
                    key: "cn_" + idx,
                    direction: d,
                    line1: line1 + offset,
                    line2: line2 + offset,
                    stemWidth: 0,
                    stroke: "black",
                    tuplet: this.props.spec.tuplet,
                    tupletsTemporary: null,
                    width: last.x - first.x,
                    x: first.x,
                    y: first.y
                });
            default:
                console.warn("Ignoring notation of type " + m.type);
                return null;
        }
    };
    return Duration;
})(TypedReact.Component);
var Duration;
(function (Duration) {
    Duration.Component = TypedReact.createClass(Duration, [PureModelViewMixin]);
})(Duration || (Duration = {}));
module.exports = Duration;
