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
        var direction = this.props.direction;
        var lines = this.props.lines;
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
        return React.createElement("g", null, _.map(lines, function (line, idx) { return React.createElement("g", { key: "_" + idx }, React.createElement(NoteHead.Component, { key: "_0", x: _this.props.x + (linesOffset[line] || 0), y: _this.props.y, line: line, stroke: _this.props.strokes[idx], grace: _this.props.grace[idx], notehead: _this.props.notehead }), _this.props.dotted ? _.times(_this.props.dotted, function (idx) { return React.createElement(Dot.Component, { idx: idx, key: "_1_" + idx, stroke: _this.props.strokes[0], radius: 2.4, x: _this.props.x + _this.props.dotOffset, y: _this.props.y, line: line }); }) : null); }), this.props.hasStem && React.createElement(NoteStem.Component, { x: this.props.x, y: this.props.y, key: "_2", direction: direction, line: this.props.startingLine, stroke: this.props.secondaryStroke, height: this.props.stemHeight, grace: this.props.grace[0], notehead: this.props.notehead }), this.props.flag && React.createElement(Flag.Component, { key: "_3", x: this.props.x, y: this.props.y, line: this.props.startingLine, stroke: this.props.secondaryStroke, stemHeight: this.props.stemHeight, stemWidth: 1.4, flag: this.props.flag, notehead: this.props.notehead, grace: this.props.grace[0], direction: direction }), this.props.children && _.map(this.props.children, function (component, idx) {
            component.key = "_4_" + idx;
            component.props.direction = direction;
            component.props.line = _this.props.startingLine;
            component.props.x = _this.props.x;
            component.props.y = _this.props.y;
            component.props.idx = idx;
            component.props.notehead = _this.props.notehead;
            return component;
        }), this.accidentals(), this.ledgerLines(), this.tie(), this.props.lyrics);
    };
    Note.prototype.getDefaultProps = function () {
        return {
            x: 0,
            y: 0,
            lines: 3,
            dotted: null,
            hasStem: true,
            accidentals: null,
            strokes: ["black"]
        };
    };
    Note.prototype.ledgerLines = function () {
        var _this = this;
        if (!this.props.onLedger) {
            return false;
        }
        var ret = [];
        var lowest = this.props.lowestLine;
        var highest = this.props.highestLine;
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
        if (this.props.onLedger) {
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
        var l = this.props.lines;
        var glyphOffset = 0;
        return _.map(accidentals, function (acc, idx) {
            var paren = false;
            if (typeof acc === "string") {
                paren = !!~acc.indexOf("p");
                acc = acc.replace("p", "") * 1;
            }
            if (!isNaN(acc)) {
                var glyphName;
                switch (acc) {
                    case 2:
                        glyphName = "accidentalDoubleSharp";
                        glyphOffset += 14;
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
                        glyphOffset += 18;
                        break;
                    case -0.5:
                        glyphName = "accidentalQuarterToneFlatStein";
                        break;
                    case -1.5:
                        glyphName = "accidentalNarrowReversedFlatAndFlat";
                        glyphOffset += 18;
                        break;
                    case 0.5:
                        glyphName = "accidentalQuarterToneSharpStein";
                        break;
                    case 1.5:
                        glyphName = "accidentalThreeQuarterTonesSharpStein";
                        glyphOffset += 18;
                        break;
                    default:
                        assert(0, "Not reached");
                }
                if (paren) {
                    if (glyphOffset >= 18) {
                        glyphOffset += 5;
                    }
                    else {
                        glyphOffset = 18;
                    }
                }
                return React.createElement(Accidental.Component, { x: _this.props.x - (glyphOffset || _this.accidentalSpacing()) * (_this.props.grace[idx] ? 0.6 : 1.0), y: _this.props.y, grace: _this.props.grace[idx], stroke: _this.props.accStrokes[idx], line: l[idx], key: "acc_" + idx, idx: idx, paren: paren, accidental: glyphName });
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
            direction: -this.props.direction,
            x: this.props.x + fullWidth / 8 + 6,
            y: this.props.y,
            lines1: [this.props.startingLine],
            lines2: [this.props.startingLine],
            slurW: fullWidth * 0.75
        } });
    };
    return Note;
})(TypedReact.Component);
;
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
