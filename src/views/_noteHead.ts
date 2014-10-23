/**
 * Renders a note head.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("../typedReact");

import Glyph = require("./_glyph");

class NoteHead extends TypedReact.Component<NoteHead.IProps, {}> {
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

module NoteHead {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, NoteHead);

    export interface IProps {
        fontSize: number;
        line: number;
        notehead: string;
        stroke: string;
        x: number;
        y: number;
    }
}

export = NoteHead;