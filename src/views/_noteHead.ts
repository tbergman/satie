/**
 * Renders a note head.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");

import Glyph = require("./_glyph");

export class NoteHead extends ReactTS.ReactComponentBase<IProps, {}> {
    render() {
        return Glyph.Component({
            x: this.props.x,
            y: this.props.y - (this.props.line - 3)/4,
            fill: this.props.stroke,
            fontSize: this.props.fontSize,
            glyphName: this.props.notehead});
    }
    getDefaultProps() {
        return {
            x: 0,
            y: 0,
            line: 3
        };
    }
}

export var Component = ReactTS.createReactComponent(NoteHead);

export interface IProps {
    fontSize: number;
    line: number;
    notehead: string;
    stroke: string;
    x: number;
    y: number;
}
