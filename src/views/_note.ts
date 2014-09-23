/**
 * Renders a note including annotations, dots, stems, ties, accidentals, and flags.
 * Either rendered by DurationModel or BeamGroup. Does not render beams.
 *
 * The stem height is calculated in this file.
 *
 * @jsx React.DOM
 */

import React = require("react");
import ReactTS = require("react-typescript");
import _ = require("lodash");
import assert = require("assert");

var Accidental = require("./_accidental.jsx");
var Dot = require("./_dot.jsx");
var Flag = require("./_flag.jsx");
var Group = require("./_group.jsx");
var LedgerLine = require("./_ledgerLine.jsx");
var NoteHead = require("./_noteHead.jsx");
var NoteStem = require("./_noteStem.jsx");

export class Note extends ReactTS.ReactComponentBase<IProps, IState> {
    render() {
        var direction = this.getDirection();
        var lines = this.getLines();
        var linesObj: { [key: string]: boolean } = {};
        var linesOffset: { [key: string]: number } = {};
        var i: number;

        for (i = 0; i < lines.length; ++i) {
            linesObj[lines[i]] = true;
        }
        for (i = 0; i < lines.length; ++i) {
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
        return Group(null,
            _.map(lines, (line: string, idx: number) => [
                // XXX(profile) make more efficient
                NoteHead({
                    key: idx + "l",
                    x: this.props.x + (linesOffset[line] || 0),
                    y: this.props.y,
                    fontSize: this.props.fontSize,
                    line: line,
                    stroke: this.props.strokes[idx],
                    notehead: this.props.notehead})].concat(
                this.props.dotted ? _.times(this.props.dotted, idx => Dot({
                    idx: idx,
                    key: idx + "d",
                    stroke: this.props.strokes[0],
                    x: this.props.x,
                    y: this.props.y,
                    fontSize: this.props.fontSize,
                    line: line})): null)).concat([
            this.props.hasStem && NoteStem({
                x: this.props.x,
                y: this.props.y,
                key: "stem",
                direction: direction,
                line: this.getStartingLine(),
                stroke: this.props.secondaryStroke,
                height: this.getStemHeight(),
                fontSize: this.props.fontSize,
                notehead: this.props.notehead}),
            this.props.flag && Flag({
                key: "flag",
                x: this.props.x,
                y: this.props.y,
                line: this.getHeightDeterminingLine(),
                stroke: this.props.secondaryStroke,
                flag: this.props.flag,
                fontSize: this.props.fontSize,
                notehead: this.props.notehead,
                direction: direction})]).concat(
            this.props.children && _.map(this.props.children, (element: { props: IProps }, idx: number) => {
                element.props.direction = direction;
                element.props.line = this.getStartingLine();
                element.props.x = this.props.x;
                element.props.y = this.props.y;
                element.props.idx = idx;
                element.props.notehead = this.props.notehead;
                element.props.fontSize = this.props.fontSize;
                return element;
            })).concat(
            this.accidentals()).concat(
            this.ledgerLines()).concat( // XXX(profile) make more efficient
            this.tie())
        );
    }

    getDefaultProps(): IProps {
        return <IProps> {
            x: 0,
            y: 0,
            line: 3,
            dotted: null,
            hasStem: true,
            accidentals: null,
            strokes: ["black"]
        };
    }

    getDirection(): number {
        if (this.props.direction) {
            return this.props.direction;
        }
        var consider: number;
        if (this.props.line.length) {
            consider = _.reduce(this.props.line, (memo: number, i: number) => memo + i/this.props.line.length, 0);
        } else {
            consider = this.props.line;
        }

        if (consider > 3) {
            return -1;
        } else if (consider <= 3) {
            return 1;
        }
        assert(0);
    }
    getLines() {
        return this.props.line.length ? this.props.line : [this.props.line];
    }
    getLowestLine() {
        return _.reduce(this.getLines(), (a: number, b: number) => Math.min(a, b), 99999);
    }
    getHighestLine() {
        return _.reduce(this.getLines(), (a: number, b: number) => Math.max(a, b), -99999);
    }
    getStartingLine() {
        return (this.getDirection() === 1 ? this.getLowestLine : this.getHighestLine)();
    }
    getHeightDeterminingLine() {
        return (this.getDirection() === 1 ? this.getHighestLine : this.getLowestLine)();
    }
    getStemHeight() {
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
    }
    isOnLedger() {
        var lowest = this.getLowestLine();
        var highest = this.getHighestLine();
        return lowest < 0.5 || highest > 5.5;
    }
    ledgerLines(): any {
        if (!this.isOnLedger()) { // check is here to force isOnLedgerLine to be accurate
            return false;
        }
        var ret: Array<number> = [];
        var lowest = this.getLowestLine();
        var highest = this.getHighestLine();
        if (lowest < 0.5) {
            ret = ret.concat(_.times(Math.floor(1 - lowest), idx =>
                LedgerLine({
                    key: idx + "low",
                    line: -idx,
                    notehead: this.props.notehead,
                    x: this.props.x,
                    y: this.props.y})));
        }
        if (highest > 5.5) {
            ret = ret.concat(_.times(Math.floor(highest - 5), idx =>
                LedgerLine({
                    key: idx + "high",
                    line: 6 + idx,
                    notehead: this.props.notehead,
                    x: this.props.x,
                    y: this.props.y})));
        }
        assert(ret.length);
        return ret;
    }
    accidentalSpacing() {
        if (this.isOnLedger()) {
            return 0.36;
        } else {
            return 0.3;
        }
    }
    accidentals(): any {
        if (this.props.accidentals === null) {
            return false;
        }

        var accidentals = this.props.accidentals;
        accidentals = accidentals.length ? accidentals : [accidentals];

        var l = this.getLines();
        var glyphOffset = 0;

        return _.map(accidentals, (acc, idx) => {
            if (!isNaN(<any>acc)) {
                var glyphName: string;
                switch(acc) {
                    case 2:
                        glyphName = "accidentalDoubleSharp";
                        glyphOffset = 0.45;
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
                        glyphOffset = 0.45;
                        break;
                    default:
                        assert(0, "Not reached");
                }
                return Accidental({
                    x: this.props.x - (glyphOffset || this.accidentalSpacing()),
                    y: this.props.y,
                    stroke: this.props.accStrokes[idx],
                    fontSize: this.props.fontSize,
                    line: l[idx],
                    key: "acc_" + idx,
                    idx: idx,
                    accidental: glyphName});
            } else {
                return false;
            }
        });
    }
    tie() {
        var Tie = require("../views/slur"); // XXX: Ugly hack

        if (!this.props.tieTo) {
            return null;
        }

        var fullWidth = this.props.tieTo - this.props.x;
        return Tie.Component({key: "tie_0",
            fontSize: this.props.fontSize,
            spec: {
                direction: -this.getDirection(),
                x: this.props.x + fullWidth/8 + 0.15,
                y: this.props.y,
                lines1: [this.getStartingLine()],
                lines2: [this.getStartingLine()],
                width: fullWidth*0.75}});
    }
};

var IDEAL_STEM_HEIGHT = 3.5;
var MIN_STEM_HEIGHT = 2.5;

export function getExtremeLine(line: any, direction: number) {
    "use strict";
    if (!isNaN(line*1)) {
        return line*1;
    } else if (direction === 1) {
        return _.reduce(line, (m: number, s: number) => Math.min(m, s), 99999);
    } else {
        return _.reduce(line, (m: number, s: number) => Math.max(m, s), -99999);
    }
};

export var Component = ReactTS.createReactComponent(Note);

export interface IProps {
    accidentals?: any;
    accStrokes?: any;
    children?: React.ReactComponent<any, any>[];
    direction?: number;
    dotted?: number;
    idx?: number;
    flag?: string;
    fontSize?: number;
    hasStem?: boolean;
    key?: string;
    line?: any;
    notehead?: string;
    secondaryStroke?: any;
    stemHeight?: number;
    strokes?: any;
    tieTo?: any;
    x?: number;
    y?: number;
}

export interface IState {
}