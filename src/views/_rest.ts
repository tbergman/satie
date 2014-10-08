/**
 * Renders a rest.
 */

import ReactTS = require("react-typescript");
import _ = require("lodash");

import Dot = require("./_dot");
import Glyph = require("./_glyph");
import Group = require("./_group");
import NoteMarking = require("./_noteMarking");

export class Rest extends ReactTS.ReactComponentBase<IProps, {}> {
    render() {
        var line = this.props.line;
        return Group(null,
            Glyph.Component({
                key: "r",
                x: this.props.x + this.props.spacing,
                y: this.props.y,
                fill: this.props.stroke,
                fontSize: this.props.fontSize,
                glyphName: this.props.notehead}),
            this.props.dotted ? _.times(this.props.dotted, idx => Dot.Component({
                idx: idx,
                key: idx + "d",
                radius: 0.06,
                stroke: this.props.stroke,
                x: this.props.x + this.props.spacing,
                y: this.props.y,
                fontSize: this.props.fontSize,
                line: line})): null,
            this.props.children && _.map(this.props.children, (element, idx) => {
                element.props.direction = this.direction;
                element.props.line = this.startingLine;
                element.props.x = this.props.x;
                element.props.y = this.props.y;
                element.props.idx = idx;
                element.props.notehead = this.props.notehead;
                element.props.fontSize = this.props.fontSize;
                return element;
            })
        );
    }

    get direction() {
        return 1;
    }

    get startingLine() {
        // TODO: stub
        return 3;
    }
}

export var Component = ReactTS.createReactComponent(Rest);

export interface IProps {
    children: Array<NoteMarking.NoteMarking>;
    dotted: number;
    fontSize: number;
    line: number;
    notehead: string;
    spacing: number;
    stroke: string;
    x: number;
    y: number;
}
