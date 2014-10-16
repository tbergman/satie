/**
 * Renders an accidental centered at (x, y) on line 'line'.
 * Position adjustments of accidentals should be taken care of by DurationModel.
 */

import ReactTS = require("react-typescript");

import Glyph = require("./_glyph");

class Accidental extends ReactTS.ReactComponentBase<Accidental.IProps, {}> {
    render() {
        return Glyph.Component({
            x: this.props.x,
            y: this.props.y - (this.props.line - 3)/4,
            fill: this.props.stroke,
            fontSize: this.props.fontSize,
            glyphName: this.props.accidental,
			"selection-info": "accidental-" + this.props.idx});
    }
}

module Accidental {
    export interface IProps {
        accidental: string;
        fontSize: number;
        idx?: number;
        line: number;
        stroke?: string;
        x: number;
        y: number;
    }

    export var Component = ReactTS.createReactComponent(Accidental);
}

export = Accidental;