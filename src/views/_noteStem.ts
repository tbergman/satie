/**
 * Renders a stem based on a height decided in Note.
 */

import ReactTS = require("react-typescript");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");

import Line = require("./_line");
import SMuFL = require("../util/SMuFL");
import getFontOffset = require("./_getFontOffset");

var stemThickness: number = SMuFL.bravuraMetadata.engravingDefaults.stemThickness/4;

export class NoteStem extends ReactTS.ReactComponentBase<IProps, {}> {
    render() {
        var fontOffset = this.getFontOffset();
        return Line.Component({
            x1: this.props.x + fontOffset[0]/4 + this.lineXOffset,
            x2: this.props.x + fontOffset[0]/4 + this.lineXOffset,
            y1: this.props.y - fontOffset[1]/4 - (this.props.line - 3)/4,
            y2: this.props.y -
                (this.props.line - 3)/4 -
                fontOffset[1]/4 -
                this.direction*this.height/4,
            stroke: this.props.stroke,
            strokeWidth: stemThickness});
    }

    get height() {
        return this.props.height;
    }

    get direction() {
        return this.props.direction;
    }

    get lineXOffset() {
        return this.direction * - stemThickness/2;
    }

    getFontOffset = getFontOffset;

    getDefaultProps() {
        return {
            x: 0,
            y: 0,
            height: 3.5,
            stroke: "#000000"
        };
    }
}

NoteStem.applyMixins(PureRenderMixin);

export var Component = ReactTS.createReactComponent(NoteStem);

export interface IProps {
    height: number;
    direction: number; // -1 or 1
    line: number;
    notehead: string;
    stroke: string;
    x: number;
    y: number;
}
