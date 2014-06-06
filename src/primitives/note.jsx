/**
 * Renders a note including annotations, dots, stems, ties, accidentals, and flags.
 * Either rendered by PitchBridge or BeamGroup. Does not render beams.
 *
 * The stem height is calculated in this file.
 *
 * @jsx React.DOM
 */

var React = require('react');
var _ = require("underscore");
var assert = require("assert");

var Accidental = require("./accidental.jsx");
var Dot = require("./dot.jsx");
var Flag = require("./flag.jsx");
var Glyph = require("./glyph.jsx");
var LedgerLine = require("./ledgerLine.jsx");
var NoteHead = require("./noteHead.jsx");
var NoteMarking = require("./noteMarking.jsx");
var NoteStem = require("./noteStem.jsx");
var SMuFL = require("./SMuFL.js");
var getFontOffset = require("./getFontOffset.jsx");

var Note = React.createClass({
    propTypes: {
        /* validated fully in NoteHead */
        notehead: React.PropTypes.any.isRequired,
        stemWidth: React.PropTypes.number,
        stemHeight: React.PropTypes.number,
        dotted: React.PropTypes.any,
        accidentals: React.PropTypes.any
    },
    shouldComponentUpdate: function(nextProps) {
        // TODO: check children
        if ((this.props.strokes && this.props.strokes.length) !==
                (nextProps.strokes && nextProps.strokes.length)) {
            return true;
        } else if (this.props.strokes) {
            for (var i = 0; i < nextProps.strokes.length; ++i) {
                if (nextProps.strokes[i] !== this.props.strokes[i]) {
                    return true;
                }
            }
        }

        var p = !this.props.accStrokes;
        var p2 = !nextProps.accStrokes;

        if (p !== p2) {
            return true;
        } else if (nextProps.accStrokes) {
            if (nextProps.accStrokes.length !== this.props.accStrokes.length) {
                return true;
            }
            for (var i = 0; i < nextProps.accStrokes.length; ++i) {
                if (nextProps.accStrokes[i] !== this.props.accStrokes[i]) {
                    return true;
                }
            }
        }
        return this.props.accStrokes !== nextProps.accStrokes ||
            this.props.accidentals !== nextProps.accidentals ||
            this.props.dotted !== nextProps.dotted ||
            this.props.flag !== nextProps.flag ||
            this.props.hasStem !== nextProps.hasStem ||
            this.props.line !== nextProps.line ||
            this.props.notehead !== nextProps.notehead ||
            this.props.stemHeight !== nextProps.stemHeight ||
            this.props.stemWidth !== nextProps.stemWidth ||
            this.props.tieTo !== nextProps.tieTo ||
            this.props.x !== nextProps.x ||
            this.props.y !== nextProps.y;
    },
    getDefaultProps: function() {
        return {
            x: 0,
            y: 0,
            line: 3,
            stemWidth: 0.035,
            dotted: false,
            hasStem: true,
            accidentals: undefined,
            strokes: ["black"]
        };
    },

    render: function() {
        var direction = this.getDirection();
        var lines = this.getLines();
        var lowestLine = this.getLowestLine();
        var linesObj = {};
        var linesOffset = {};
        for (var i = 0; i < lines.length; ++i) {
            linesObj[lines[i]] = true;
        }
        for (var i = 0; i < lines.length; ++i) {
            if (linesObj[lines[i] - 0.5]) {
                var x = 0.5;
                for (var j = lines[i] - 1; linesObj[j]; j -= 0.5) {
                    if (x === 0.5) {
                        x = 0;
                    } else {
                        x = 0.5;
                    }
                }
                if (direction === 1) {
                    linesOffset[lines[i] + 0.5 - x] = 0.035*4*2;
                    linesOffset[lines[i] - x] = 0;
                } else {
                    linesOffset[lines[i] + 0.5 - x] = 0;
                    linesOffset[lines[i] - x] = -0.035*4*2;
                }
            }
        }
        return <g>
            {lines.map((line, idx) => [
                <NoteHead
                    key={idx + "l"}
                    x={this.props.x + (linesOffset[line] || 0)}
                    y={this.props.y}
                    line={line}
                    stroke={this.props.strokes[idx]}
                    notehead={this.props.notehead} />].concat(
                this.props.dotted && _(this.props.dotted).times(idx => <Dot
                    idx={idx}
                    key={idx + "d"}
                    stroke={this.props.strokes[0]}
                    x={this.props.x}
                    y={this.props.y}
                    line={line} />)))}
            {this.props.hasStem && <NoteStem
                x={this.props.x}
                y={this.props.y}
                line={this.getStartingLine()}
                width={0.035}
                direction={direction}
                height={this.getStemHeight()}
                notehead={this.props.notehead} />}
            {this.props.flag && <Flag
                x={this.props.x}
                y={this.props.y}
                line={this.getHeightDeterminingLine()}
                flag={this.props.flag}
                notehead={this.props.notehead}
                direction={direction} />}
            {this.props.children && this.props.children.map((element, idx) => {
                element.props.direction = direction;
                element.props.line = this.getStartingLine();
                element.props.x = this.props.x;
                element.props.y = this.props.y;
                element.props.idx = idx;
                element.props.notehead = this.props.notehead;
                return element;
            })}
            {this.accidentals()}
            {this.ledgerLines()}
            {this.tie()}
        </g>;
    },

    getDirection: function() {
        if (this.props.direction) {
            return this.props.direction;
        }
        var consider;
        if (this.props.line.length) {
            consider = _(this.props.line).reduce((memo, i) => memo + i/this.props.line.length, 0);
        } else {
            consider = this.props.line;
        }

        if (consider > 3) {
            return -1;
        } else if (consider <= 3) {
            return 1;
        }
        console.assert(0);
    },
    getLines: function() {
        return this.props.line.length ? this.props.line : [this.props.line];
    },
    getLowestLine: function() {
        return _(this.getLines()).reduce((a, b) => Math.min(a, b), 99999);
    },
    getHighestLine: function() {
        return _(this.getLines()).reduce((a, b) => Math.max(a, b), -99999);
    },
    getStartingLine: function() {
        return (this.getDirection() === 1 ? this.getLowestLine : this.getHighestLine)();
    },
    getHeightDeterminingLine: function() {
        return (this.getDirection() === 1 ? this.getHighestLine : this.getLowestLine)();
    },
    getStemHeight: function() {
        if (this.props.stemHeight) {
            return this.props.stemHeight;
        }

        var extraHeight = this.getHighestLine() - this.getLowestLine();
        var idealStemHeight = IDEAL_STEM_HEIGHT + extraHeight;
        var minStemHeight = MIN_STEM_HEIGHT + extraHeight;

        var start = this.getHeightDeterminingLine();
        var idealExtreme = start + this.getDirection()*idealStemHeight;

        if (idealExtreme >= 6.5) {
            return Math.max(minStemHeight, idealStemHeight - (idealExtreme - 6.5));
        } else if (idealExtreme <= -1.5) {
            return Math.max(minStemHeight, idealStemHeight - (-1.5 - idealExtreme));
        }

        return 3.5;
    },
    isOnLedger: function(line) {
        var lowest = this.getLowestLine();
        var highest = this.getHighestLine();
        return lowest < 0.5 || highest > 5.5;
    },
    ledgerLines: function() {
        if (!this.isOnLedger()) { // check is here to force isOnLedgerLine to be accurate
            return false;
        }
        var ret = [];
        var lowest = this.getLowestLine();
        var highest = this.getHighestLine();
        if (lowest < 0.5) {
            ret = ret.concat(_(Math.floor(1 - lowest)).times(idx =>
                <LedgerLine
                    key={idx + "low"}
                    line={-idx}
                    notehead={this.props.notehead}
                    x={this.props.x}
                    y={this.props.y} />));
        }
        if (highest > 5.5) {
            ret = ret.concat(_(Math.floor(highest - 5)).times(idx =>
                <LedgerLine
                    key={idx + "high"}
                    line={6 + idx}
                    notehead={this.props.notehead}
                    x={this.props.x}
                    y={this.props.y} />));
        }
        assert(ret.length);
        return ret;
    },
    accidentalSpacing: function() {
        if (this.isOnLedger()) {
            return 0.36;
        } else {
            return 0.3;
        }
    },
    accidentals: function() {
        if (this.props.accidentals === undefined) {
            return false;
        }

        var accidentals = this.props.accidentals;
        accidentals = accidentals.length ? accidentals : [accidentals];

        var l = this.getLines();

        return accidentals.map((acc, idx) => {
            if (!isNaN(acc)) {
                var glyphName;
                switch(acc) {
                    case 1:
                        glyphName = "accidentalSharp";
                        break;
                    case 0:
                        glyphName = "accidentalNatural";
                        break;
                    case -1:
                        glyphName = "accidentalFlat";
                        break;
                    default:
                        assert(0, "Not reached");
                }
                return <Accidental
                    x={this.props.x - this.accidentalSpacing()}
                    y={this.props.y}
                    stroke={this.props.accStrokes[idx]}
                    line={l[idx]}
                    key={"acc_" + idx}
                    accidental={glyphName} />;
            } else {
                return false;
            }
        });
    },
    tie: function() {
        var Slur = require("./slur.jsx");

        if (!this.props.tieTo) {
            return null;
        }

        var fullWidth = this.props.tieTo - this.props.x;
        return <Slur
            direction={-this.getDirection()}
            x={this.props.x + fullWidth/8 + 0.15}
            y={this.props.y}
            line1={this.getStartingLine()}
            line2={this.getStartingLine()}
            width={fullWidth*0.75}
            scaleFactor={this.props.scaleFactor} />;
    }
});

var IDEAL_STEM_HEIGHT = 3.5;
var MIN_STEM_HEIGHT = 2.5;

var getExtremeLine = (line, direction) => {
    if (!isNaN(line)) {
        return line;
    } else if (direction === 1) {
        return _(line).reduce((m, s) => Math.min(m, s), 99999);
    } else {
        return _(line).reduce((m, s) => Math.max(m, s), -99999);
    }
};

module.exports = Note;
module.exports.getExtremeLine = getExtremeLine;
