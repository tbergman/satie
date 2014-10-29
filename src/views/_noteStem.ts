/**
 * Renders a stem based on a height decided in Note.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");

import Line = require("./_line");
import SMuFL = require("../util/SMuFL");
import getFontOffset = require("./_getFontOffset");

var stemThickness: number = SMuFL.bravuraMetadata.engravingDefaults.stemThickness/4;

class NoteStem extends TypedReact.Component<NoteStem.IProps, {}> {
    render() {
        var fontOffset = this.getFontOffset();
        return Line.Component({
            x1: this.props.x + fontOffset[0]/4 + this.lineXOffset(),
            x2: this.props.x + fontOffset[0]/4 + this.lineXOffset(),
            y1: this.props.y - fontOffset[1]/4 - (this.props.line - 3)/4,
            y2: this.props.y -
                (this.props.line - 3)/4 -
                fontOffset[1]/4 -
                this.direction()*this.height()/4,
            stroke: this.props.stroke,
            strokeWidth: stemThickness});
    }

    height() {
        return this.props.height;
    }

    direction() {
        return this.props.direction;
    }

    lineXOffset() {
        return this.direction() * - stemThickness/2;
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

NoteStem.prototype.mixins = [PureRenderMixin];

module NoteStem {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, NoteStem);

    export interface IProps {
        height: number;
        direction: number; // -1 or 1
        line: number;
        notehead: string;
        stroke: string;
        x: number;
        y: number;
    }
}

export = NoteStem;