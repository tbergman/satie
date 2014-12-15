/**
 * Renders an accidental centered at (x, y) on line 'line'.
 * Position adjustments of accidentals should be taken care of by DurationModel.
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");

import Glyph = require("./_glyph");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");

class Accidental extends TypedReact.Component<Accidental.IProps, {}> {
    render() {
        return <!Glyph.Component
            x={this.props.x}
            y={this.props.y - (this.props.line - 3)*10}
            fill={this.props.stroke}
            opacity={this.props.opacity}
            glyphName={this.props.accidental}
			"selection-info"={"accidental-" + this.props.idx} />
    }
}

module Accidental {
    "use strict";
    export var Component = TypedReact.createClass(Accidental, [PureRenderMixin]);

    export interface IProps {
        accidental: string;
        opacity?: number;
        idx?: number;
        line: number;
        stroke?: string;
        x: number;
        y: number;
    }
}

export = Accidental;
