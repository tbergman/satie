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
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");
var Accidental = require("./_accidental");
var Dot = require("./_dot");
var Flag = require("./_flag");
var LedgerLine = require("./_ledgerLine");
var NoteHead = require("./_noteHead");
var NoteStem = require("./_noteStem");
var Note = (function (_super) {
    __extends(Note, _super);
    function Note() {
        _super.apply(this, arguments);
    }
    Note.prototype.render = function () {
        var _this = this;
        var direction = this.direction();
        var lines = this.getLines();
        var linesObj = {};
        var linesOffset = {};
        var i;
        for (i = 0; i < lines.length; ++i) {
            linesObj[lines[i]] = true;
        }
        for (i = 0; i < lines.length; ++i) {
            assert(!isNaN(lines[i]));
            if (linesObj[lines[i] - 0.5]) {
                var x = 0.5;
                for (var j = lines[i] - 1; linesObj[j]; j -= 0.5) {
                    if (x === 0.5) {
                        x = 0;
                    }
                    else {
                        x = 0.5;
                    }
                }
                if (direction === 1) {
                    linesOffset[lines[i] + 0.5 - x] = 1.4 * 4 * 2;
                    linesOffset[lines[i] - x] = 0;
                }
                else {
                    linesOffset[lines[i] + 0.5 - x] = 0;
                    linesOffset[lines[i] - x] = -1.4 * 4 * 2;
                }
            }
        }
        return React.createElement("g", null, _.map(lines, function (line, idx) { return React.createElement("g", { key: "_" + idx }, React.createElement(NoteHead.Component, { key: "_0", x: _this.props.x + (linesOffset[line] || 0), y: _this.props.y, line: line, stroke: _this.props.strokes[idx], notehead: _this.props.notehead }), _this.props.dotted ? _.times(_this.props.dotted, function (idx) { return React.createElement(Dot.Component, { idx: idx, key: "_1_" + idx, stroke: _this.props.strokes[0], radius: 2.4, x: _this.props.x, y: _this.props.y, line: line }); }) : null, _this.props.hasStem && React.createElement(NoteStem.Component, { x: _this.props.x, y: _this.props.y, key: "_2", direction: direction, line: _this.getStartingLine(), stroke: _this.props.secondaryStroke, height: _this.getStemHeight(), notehead: _this.props.notehead }), _this.props.flag && React.createElement(Flag.Component, { key: "_3", x: _this.props.x, y: _this.props.y, line: _this.getStartingLine(), stroke: _this.props.secondaryStroke, stemHeight: _this.getStemHeight(), stemWidth: 1.4, flag: _this.props.flag, notehead: _this.props.notehead, direction: direction }), _this.props.children && _.map(_this.props.children, function (component, idx) {
            component.key = "_4_" + idx;
            component.props.direction = direction;
            component.props.line = _this.getStartingLine();
            component.props.x = _this.props.x;
            component.props.y = _this.props.y;
            component.props.idx = idx;
            component.props.notehead = _this.props.notehead;
            return component;
        }), _this.accidentals(), _this.ledgerLines(), _this.tie(), _this.props.lyrics); }));
    };
    Note.prototype.getDefaultProps = function () {
        return {
            x: 0,
            y: 0,
            line: 3,
            dotted: null,
            hasStem: true,
            accidentals: null,
            strokes: ["black"]
        };
    };
    Note.prototype.direction = function () {
        var _this = this;
        if (this.props.direction) {
            return this.props.direction;
        }
        var consider;
        if (this.props.line.length) {
            consider = _.reduce(this.props.line, function (memo, i) { return memo + i / _this.props.line.length; }, 0);
        }
        else {
            consider = this.props.line;
        }
        if (consider > 3) {
            return -1;
        }
        else if (consider <= 3) {
            return 1;
        }
        assert(0);
    };
    Note.prototype.getLines = function () {
        return this.props.line.length ? this.props.line : [this.props.line];
    };
    Note.prototype.getLowestLine = function () {
        return _.reduce(this.getLines(), function (a, b) { return Math.min(a, b); }, 99999);
    };
    Note.prototype.getHighestLine = function () {
        return _.reduce(this.getLines(), function (a, b) { return Math.max(a, b); }, -99999);
    };
    Note.prototype.getStartingLine = function () {
        return this.direction() === 1 ? this.getLowestLine() : this.getHighestLine();
    };
    Note.prototype.getHeightDeterminingLine = function () {
        return this.direction() === 1 ? this.getHighestLine() : this.getLowestLine();
    };
    Note.prototype.getStemHeight = function () {
        if (this.props.stemHeight) {
            return this.props.stemHeight;
        }
        var heightFromOtherNotes = (this.getHighestLine() - this.getLowestLine()) * 10;
        var idealStemHeight = IDEAL_STEM_HEIGHT + heightFromOtherNotes;
        var minStemHeight = MIN_STEM_HEIGHT + heightFromOtherNotes;
        var start = this.getHeightDeterminingLine() * 10;
        var idealExtreme = start + this.direction() * idealStemHeight;
        var result;
        if (idealExtreme >= 65) {
            result = Math.max(minStemHeight, idealStemHeight - (idealExtreme - 65));
        }
        else if (idealExtreme <= -15) {
            result = Math.max(minStemHeight, idealStemHeight - (-15 - idealExtreme));
        }
        else {
            result = 35;
        }
        if (start > 30 && this.direction() === -1 && start - result > 30) {
            result = start - 30;
        }
        else if (start < 30 && this.direction() === 1 && start + result < 30) {
            result = 30 - start;
        }
        return result;
    };
    Note.prototype.isOnLedger = function () {
        var lowest = this.getLowestLine();
        var highest = this.getHighestLine();
        return lowest < 0.5 || highest > 5.5;
    };
    Note.prototype.ledgerLines = function () {
        var _this = this;
        if (!this.isOnLedger()) {
            return false;
        }
        var ret = [];
        var lowest = this.getLowestLine();
        var highest = this.getHighestLine();
        if (lowest < 0.5) {
            ret = ret.concat(_.times(Math.floor(1 - lowest), function (idx) { return React.createElement(LedgerLine.Component, { key: idx + "low", line: -idx, notehead: _this.props.notehead, x: _this.props.x, y: _this.props.y }); }));
        }
        if (highest > 5.5) {
            ret = ret.concat(_.times(Math.floor(highest - 5), function (idx) { return React.createElement(LedgerLine.Component, { key: idx + "high", line: 6 + idx, notehead: _this.props.notehead, x: _this.props.x, y: _this.props.y }); }));
        }
        assert(ret.length);
        return ret;
    };
    Note.prototype.accidentalSpacing = function () {
        if (this.isOnLedger()) {
            return 14.4;
        }
        else {
            return 12;
        }
    };
    Note.prototype.accidentals = function () {
        var _this = this;
        if (this.props.accidentals === null) {
            return false;
        }
        var accidentals = this.props.accidentals;
        accidentals = accidentals.length ? accidentals : [accidentals];
        var l = this.getLines();
        var glyphOffset = 0;
        return _.map(accidentals, function (acc, idx) {
            if (!isNaN(acc)) {
                var glyphName;
                switch (acc) {
                    case 2:
                        glyphName = "accidentalDoubleSharp";
                        glyphOffset = 18;
                        break;
                    case 1:
                        glyphName = "accidentalSharp";
                        break;
                    case 0:
                        glyphName = "accidentalNatural";
                        break;
                    case -1:
                        glyphName = "accidentalFlat";
                        break;
                    case -2:
                        glyphName = "accidentalDoubleFlat";
                        glyphOffset = 18;
                        break;
                    default:
                        assert(0, "Not reached");
                }
                return React.createElement(Accidental.Component, { x: _this.props.x - (glyphOffset || _this.accidentalSpacing()), y: _this.props.y, stroke: _this.props.accStrokes[idx], line: l[idx], key: "acc_" + idx, idx: idx, accidental: glyphName });
            }
            else {
                return null;
            }
        });
    };
    Note.prototype.tie = function () {
        var Slur = require("./slur");
        if (!this.props.tieTo) {
            return null;
        }
        var fullWidth = this.props.tieTo - this.props.x;
        return React.createElement(Slur.Component, { key: 0, spec: {
            direction: -this.direction(),
            x: this.props.x + fullWidth / 8 + 6,
            y: this.props.y,
            lines1: [this.getStartingLine()],
            lines2: [this.getStartingLine()],
            slurW: fullWidth * 0.75
        } });
    };
    return Note;
})(TypedReact.Component);
;
var IDEAL_STEM_HEIGHT = 35;
var MIN_STEM_HEIGHT = 25;
var Note;
(function (Note) {
    "use strict";
    function getExtremeLine(line, direction) {
        "use strict";
        if (!isNaN(line * 1)) {
            return line * 1;
        }
        else if (direction === 1) {
            return _.reduce(line, function (m, s) { return Math.min(m, s); }, 99999);
        }
        else {
            return _.reduce(line, function (m, s) { return Math.max(m, s); }, -99999);
        }
    }
    Note.getExtremeLine = getExtremeLine;
    ;
    Note.Component = TypedReact.createClass(Note, [PureRenderMixin]);
})(Note || (Note = {}));
module.exports = Note;
