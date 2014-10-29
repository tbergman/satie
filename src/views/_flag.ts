/**
 * Responsible for rendering the "flag" on un-beamed notes shorter than quarter notes.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("typed-react");
import assert = require("assert");

import Glyph = require("./_glyph");
import getFontOffset = require("./_getFontOffset");

class Flag extends TypedReact.Component<Flag.IProps, {}> {
    render() {
        var fontOffset = this.getFontOffset(this.glyphName());
        var noteOffset = this.getFontOffset();
        return Glyph.Component({
            x: this.props.x +
                fontOffset[0]/4 +
                ((this.props.direction === 1) ?
                    noteOffset[0]/4 - this.props.stemWidth :
                    0),
            y: this.props.y -
                (this.props.line - 3)/4 -
                noteOffset[1]/4 -
                this.direction()*this.props.stemHeight/4,
            fill: this.props.stroke,
            fontSize: this.props.fontSize,
            glyphName: this.glyphName});
    }

    directionString() {
        if (this.direction() === 1) {
            return "Up";
        } else if (this.direction() === -1) {
            return "Down";
        }

        assert(false, "Invalid direction");
    }
    direction() {
        return this.props.direction;
    }
    glyphName() {
        return this.props.flag + this.directionString;
    }

    getFontOffset = getFontOffset;
    getDefaultProps() {
        return {
            x: 0,
            y: 0,
            line: 3,
            stemHeight: 3.5,
            stemWidth: 0.035
        };
    }
}

module Flag {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Flag);

    export interface IProps {
        direction: number; // -1 or 1
        flag: string;
        fontSize: number;
        line: number;
        notehead: string;
        stemHeight: number;
        stemWidth: number;
        stroke: string;
        x: number;
        y: number;
    };
}

export = Flag;