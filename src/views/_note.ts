/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* tslint:disable */

import React            = require("react");
import TypedReact       = require("typed-react");
import _                = require("lodash");
import assert           = require("assert");
var    PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import Accidental       = require("./_accidental");
import Dot              = require("./_dot");
import Flag             = require("./_flag");
import LedgerLine       = require("./_ledgerLine");
import NoteHead         = require("./_noteHead");
import NoteNotation     = require("./_noteNotation");
import NoteStem         = require("./_noteStem");
import SlurType         = require("./slur");            // Cyclic.
import SlurModel        = require("../stores/slur");

/**
 * Renders a note including annotations, dots, stems, ties, accidentals, and flags.
 * Either rendered by DurationModel or BeamGroup. Does not render beams.
 */
class Note extends TypedReact.Component<Note.IProps, {}> {
    render() {
        var direction = this.props.direction;
        var lines = this.props.lines;
        var linesObj: { [key: string]: boolean } = {};
        var linesOffset: { [key: string]: number } = {};
        var i: number;

        for (i = 0; i < lines.length; ++i) {
            linesObj[lines[i]] = true;
        }
        for (i = 0; i < lines.length; ++i) {
            assert (!isNaN(lines[i]));
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
        return <!g>
            {_.map(lines, (line: number, idx: number) => <!g key={"_" + idx}>
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
                    x={this.props.x + this.props.dotOffset}
                    y={this.props.y}
                    line={line} />) : null}
                {this.props.hasStem && <!NoteStem.Component
                    x={this.props.x}
                    y={this.props.y}
                    key="_2"
                    direction={direction}
                    line={this.props.startingLine}
                    stroke={this.props.secondaryStroke}
                    height={this.props.stemHeight}
                    notehead={this.props.notehead} />}
                {this.props.flag && <!Flag.Component
                    key="_3"
                    x={this.props.x}
                    y={this.props.y}
                    line={this.props.startingLine}
                    stroke={this.props.secondaryStroke}
                    stemHeight={this.props.stemHeight}
                    stemWidth={1.4}
                    flag={this.props.flag}
                    notehead={this.props.notehead}
                    direction={direction} />}
                {this.props.children && _.map(this.props.children,
                    (component: React.ReactElement<NoteNotation.IProps>, idx: number) => {
                        component.key = "_4_" + idx;
                        component.props.direction = direction;
                        component.props.line = this.props.startingLine;
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
                {this.props.lyrics}
            </g>)}
        </g>;
    }

    getDefaultProps(): Note.IProps {
        return <Note.IProps> {
            x: 0,
            y: 0,
            lines: 3,
            dotted: null,
            hasStem: true,
            accidentals: null,
            strokes: ["black"]
        };
    }

    ledgerLines(): any {
        if (!this.props.onLedger) {
            return false;
        }
        var ret: Array<React.ReactElement<any>> = [];
        var lowest = this.props.lowestLine;
        var highest = this.props.highestLine;
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
        if (this.props.onLedger) {
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

        var l = this.props.lines;
        var glyphOffset = 0;

        return _.map(accidentals, (acc: any, idx: number) => {
            var paren = false;
            if (typeof acc === "string") {
                paren = !!~acc.indexOf("p");
                acc = acc.replace("p", "")*1;
            }
            if (!isNaN(<any>acc)) {
                var glyphName: string;
                switch(acc) {
                    // Standard
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

                    //Stein-Zimmermann
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
                    } else {
                        glyphOffset = 18;
                    }
                }
                return <!Accidental.Component
                    x={this.props.x - (glyphOffset || this.accidentalSpacing())}
                    y={this.props.y}
                    stroke={this.props.accStrokes[idx]}
                    line={l[idx]}
                    key={"acc_" + idx}
                    idx={idx}
                    paren={paren}
                    accidental={glyphName} />;
            } else {
                return null;
            }
        });
    }
    tie(): any {
        var Slur: typeof SlurType = require("./slur"); // Recursive.
        if (!this.props.tieTo) {
            return null;
        }

        var fullWidth = this.props.tieTo - this.props.x;
        return <!Slur.Component
            key={0}
            spec={<SlurModel>{
                direction: -this.props.direction,
                x: this.props.x + fullWidth/8 + 6,
                y: this.props.y,
                lines1: [this.props.startingLine],
                lines2: [this.props.startingLine],
                slurW: fullWidth*0.75}} />;
    }
};

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

    export var Component = TypedReact.createClass(Note, [PureRenderMixin]);

    export interface IProps {
        accidentals?: any;
        accStrokes?: string[];
        children?: Array<React.ReactElement<NoteNotation.IProps>>;
        direction?: number;
        dotted?: number;
        dotOffset?: number;
        idx?: number;
        flag?: string;
        hasStem?: boolean;
        onLedger?: boolean;
        key?: string;
        lines?: any;
        lowestLine?: number;
        highestLine?: number;
        lyrics?: any;
        notehead?: string;
        secondaryStroke?: string;
        stemHeight?: number;
        strokes?: string[];
        tieTo?: any;
        x?: number;
        y?: number;
        startingLine?: number;
    }
}

export = Note;
