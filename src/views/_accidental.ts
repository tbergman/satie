/**
 * Renders an accidental centered at (x, y) on line 'line'.
 * Position adjustments of accidentals should be taken care of by DurationModel.
 */

/* tslint:disable */

import React            = require("react");
import TypedReact       = require("typed-react");
import PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import C                = require("../stores/contracts");
import Glyph            = require("./_glyph");

class Accidental extends TypedReact.Component<Accidental.IProps, {}> {
    render() {
        var accidental = <!Glyph.Component
            x={this.props.x}
            y={this.props.y - (this.props.line - 3)*10}
            fill={this.props.stroke}
            scale={this.props.grace ? 0.6 : 1.0}
            opacity={this.props.opacity}
            glyphName={this.props.accidental}
			"selection-info"={"accidental-" + this.props.idx} />;

        if (this.props.paren) {
            var width = C.SMuFL.bravuraBBoxes[this.props.accidental][0]*10;
            return <!g>
                <!Glyph.Component
                        x={this.props.x - 7}
                        y={this.props.y - (this.props.line - 3)*10} 
                        glyphName="accidentalParensLeft" />
                {accidental}
                <!Glyph.Component
                        x={this.props.x + width}
                        y={this.props.y - (this.props.line - 3)*10} 
                        glyphName="accidentalParensRight" />
            </g>
        } else {
            return accidental;
        }
    }
}

module Accidental {
    "use strict";
    export var Component = TypedReact.createClass(Accidental, [PureRenderMixin]);

    export interface IProps {
        accidental: string;
        opacity?: number;
        idx?: number;
        paren?: boolean;
        grace?: C.MusicXML.Grace;
        line: number;
        stroke?: string;
        x: number;
        y: number;
    }
}

export = Accidental;
