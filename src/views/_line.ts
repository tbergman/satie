/**
 * Renders a straight line.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("typed-react");

import RenderableMixin = require("./_renderable");
var Victoria = require("../renderer/victoria/victoria");

var VRect = Victoria.VRect;

class Line extends TypedReact.Component<Line.IProps, {}> {
    renderSVG() {
        return React.DOM.line({
            className: this.props.className,
            x1: <any> (this.props.x1 + "em"),
            x2: <any> (this.props.x2 + "em"),
            y1: <any> (this.props.y1 + "em"),
            y2: <any> (this.props.y2 + "em"),
            stroke: this.props.stroke,
            strokeWidth: <any> (this.props.strokeWidth + "em")});
    }

    renderGL() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        var xFactor: number;
        var yFactor: number;

        if (Math.abs(this.props.x2 - this.props.x1) <
                Math.abs(this.props.y2 - this.props.y1)) {
            xFactor = 1;
            yFactor = 0;
        } else {
            xFactor = 0;
            yFactor = 1;
        }

        return VRect({
            fill: fill,
            x1: this.props.x1 - xFactor*this.props.strokeWidth/2,
            x2: this.props.x2 + xFactor*this.props.strokeWidth/2,
            y1: this.props.y1 - yFactor*this.props.strokeWidth/2,
            y2: this.props.y2 + yFactor*this.props.strokeWidth/2});
    }
}

Line.prototype.mixins = [RenderableMixin];

module Line {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Line);

    export interface IProps {
        className?: string;
        stroke: string;
        strokeWidth: number;
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    }
}

export = Line;