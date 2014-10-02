/**
 * Responsible for rendering the "flag" on unbeamed eigth notes and shorter.
 *
 * @jsx React.DOM
 */

import ReactTS = require("react-typescript");
import assert = require("assert");

import Glyph = require("./_glyph");
import getFontOffset = require("./_getFontOffset");

export class Flag extends ReactTS.ReactComponentBase<IProps, {}> {
    render() {
        var fontOffset = this.getFontOffset(this.glyphName);
        return Glyph.Component({
            x: this.props.x +
                fontOffset[0]/4 +
                ((this.props.direction === 1) ?
                    fontOffset[0]/4 - this.props.stemWidth :
                    0),
            y: this.props.y -
                (this.props.line - 3)/4 -
                this.direction*fontOffset[1]/4 -
                fontOffset[1]/4 -
                this.direction*this.props.stemHeight/4,
            fill: this.props.stroke,
            fontSize: this.props.fontSize,
            glyphName: this.glyphName});
    }

    get directionString() {
        if (this.direction === 1) {
            return "Up";
        } else if (this.direction === -1) {
            return "Down";
        }

        assert(false, "Invalid direction");
    }
    get direction() {
        return this.props.direction;
    }
    get glyphName() {
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

export var Component = ReactTS.createReactComponent(Flag);

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
