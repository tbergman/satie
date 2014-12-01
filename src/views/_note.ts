/**
 * Renders a note including annotations, dots, stems, ties, accidentals, and flags.
 * Either rendered by DurationModel or BeamGroup. Does not render beams.
 * 
 * The stem height is calculated in this file.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");
import assert = require("assert");

import Accidental = require("./_accidental");
import Dot = require("./_dot");
import Flag = require("./_flag");
import Group = require("./_group");
import LedgerLine = require("./_ledgerLine");
import NoteHead = require("./_noteHead");
import NoteNotation = require("./_noteNotation");
import NoteStem = require("./_noteStem");
import SlurType = require("./slur"); // Recursive.

class Note extends TypedReact.Component<Note.IProps, {}> {
    render() {
        var direction = this.direction();
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
                    linesOffset[lines[i] + 0.5 - x] = 1.4 * 4 * 2;
                    linesOffset[lines[i] - x] = 0;
                } else {
                    linesOffset[lines[i] + 0.5 - x] = 0;
                    linesOffset[lines[i] - x] = -1.4 * 4 * 2;
                }
            }
        }
        return <!Group.Component>
            {_.map(lines, (line: number, idx: number) => <!Group.Component key={"_" + idx}>
                <!NoteHead.Component
                    key="_0"
                    x={this.props.x + (linesOffset[line] || 0)}
                    y={this.props.y}
                    line={line}
                    stroke={this.props.strokes[idx]}
                    notehead={this.props.notehead} />
                {this.props.dotted ? _.times(this.props.dotted, idx => <!Dot.Component
                    idx={idx}
                    key={"_1_" + idx}
                    stroke={this.props.strokes[0]}
                    radius={2.4}
                    x={this.props.x}
                    y={this.props.y}
                    line={line} />) : null}
                {this.props.hasStem && <!NoteStem.Component
                    x={this.props.x}
                    y={this.props.y}
                    key="_2"
                    direction={direction}
                    line={this.getStartingLine()}
                    stroke={this.props.secondaryStroke}
                    height={this.getStemHeight()}
                    notehead={this.props.notehead} />}
                {this.props.flag && <!Flag.Component
                    key="_3"
                    x={this.props.x}
                    y={this.props.y}
                    line={this.getStartingLine()}
                    stroke={this.props.secondaryStroke}
                    stemHeight={this.getStemHeight()}
                    stemWidth={1.4}
                    flag={this.props.flag}
                    notehead={this.props.notehead}
                    direction={direction} />}
                {this.props.children && _.map(this.props.children,
                    (component: React.ReactComponentElement<NoteNotation.IProps>, idx: number) => {
                        component.key = "_4_" + idx;
                        component.props.direction = direction;
                        component.props.line = this.getStartingLine();
                        component.props.x = this.props.x;
                        component.props.y = this.props.y;
                        component.props.idx = idx;
                        component.props.notehead = this.props.notehead;
                        return component;
                    }
                )}
                {this.accidentals()}
                {this.ledgerLines()}
                {this.tie()}
            </Group.Component>)}
        </Group.Component>;
    }

    getDefaultProps(): Note.IProps {
        return <Note.IProps> {
            x: 0,
            y: 0,
            line: 3,
            dotted: null,
            hasStem: true,
            accidentals: null,
            strokes: ["black"]
        };
    }

    direction(): number {
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
        return this.direction() === 1 ? this.getLowestLine() : this.getHighestLine();
    }
    getHeightDeterminingLine() {
        return this.direction() === 1 ? this.getHighestLine() : this.getLowestLine();
    }
    getStemHeight() {
        if (this.props.stemHeight) {
            return this.props.stemHeight;
        }

        var heightFromCount = Math.max(0, (Math.log(this.props.heightDeterminingCount) / Math.log(2)) - 4)*10 / 2;

        var heightFromOtherNotes = (this.getHighestLine() - this.getLowestLine()) * 10;
        var idealStemHeight = IDEAL_STEM_HEIGHT + heightFromOtherNotes + heightFromCount;
        var minStemHeight = MIN_STEM_HEIGHT + heightFromOtherNotes + heightFromCount;

        var start = this.getHeightDeterminingLine();
        var idealExtreme = start + this.direction()*idealStemHeight;

        if (idealExtreme >= 65) {
            return Math.max(minStemHeight, idealStemHeight - (idealExtreme - 65));
        } else if (idealExtreme <= -15) {
            return Math.max(minStemHeight, idealStemHeight - (-15 - idealExtreme));
        }

        return 35;
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
        var ret: Array<React.ReactElement<any, any>> = [];
        var lowest = this.getLowestLine();
        var highest = this.getHighestLine();
        if (lowest < 0.5) {
            ret = ret.concat(_.times(Math.floor(1 - lowest), idx =>
                <!LedgerLine.Component
                    key={idx + "low"}
                    line={-idx}
                    notehead={this.props.notehead}
                    x={this.props.x}
                    y={this.props.y} />));
        }
        if (highest > 5.5) {
            ret = ret.concat(_.times(Math.floor(highest - 5), idx =>
                <!LedgerLine.Component
                    key={idx + "high"}
                    line={6 + idx}
                    notehead={this.props.notehead}
                    x={this.props.x}
                    y={this.props.y} />));
        }
        assert(ret.length);
        return ret;
    }
    accidentalSpacing() {
        if (this.isOnLedger()) {
            return 14.4;
        } else {
            return 12;
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
                return <!Accidental.Component
                    x={this.props.x - (glyphOffset || this.accidentalSpacing())}
                    y={this.props.y}
                    stroke={this.props.accStrokes[idx]}
                    line={l[idx]}
                    key={"acc_" + idx}
                    idx={idx}
                    accidental={glyphName} />;
            } else {
                return null;
            }
        });
    }
    tie() {
        var Slur: typeof SlurType = require("./slur"); // Recursive.
        if (!this.props.tieTo) {
            return null;
        }

        var fullWidth = this.props.tieTo - this.props.x;
        return <!Slur.Component
            key={"tie_0"}
            spec={{
                direction: -this.direction(),
                x: this.props.x + fullWidth*5 + 6,
                y: this.props.y,
                lines1: [this.getStartingLine()],
                lines2: [this.getStartingLine()],
                width: fullWidth*30}} />;
    }
};

var IDEAL_STEM_HEIGHT = 35;
var MIN_STEM_HEIGHT = 25;

module Note {
    "use strict";
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

    export var Component = TypedReact.createClass(React.createClass, Note);

    export interface IProps {
        accidentals?: any;
        accStrokes?: any;
        children?: Array<React.ReactComponentElement<NoteNotation.IProps>>;
        direction?: number;
        dotted?: number;
        idx?: number;
        flag?: string;
        hasStem?: boolean;
        heightDeterminingCount?: number;
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
}

export = Note;
