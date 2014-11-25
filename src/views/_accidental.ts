/**
 * Renders an accidental centered at (x, y) on line 'line'.
 * Position adjustments of accidentals should be taken care of by DurationModel.
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");

import Glyph = require("./_glyph");

class Accidental extends TypedReact.Component<Accidental.IProps, {}> {
    render() {
        return <!Glyph.Component
            x={this.props.x}
            y={this.props.y - (this.props.line - 3)/4}
            fill={this.props.stroke}
            opacity={this.props.opacity}
            fontSize={this.props.fontSize}
            glyphName={this.props.accidental}
			"selection-info"={"accidental-" + this.props.idx} />
    }
}

module Accidental {
    "use strict";
    export interface IProps {
        accidental: string;
        fontSize: number;
        opacity?: number;
        idx?: number;
        line: number;
        stroke?: string;
        x: number;
        y: number;
    }

    export var Component = TypedReact.createClass(React.createClass, Accidental);
}

export = Accidental;