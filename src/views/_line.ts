/**
 * Renders a straight line.
 */

import React = require("react");
import ReactTS = require("react-typescript");

import RenderableMixin = require("./_renderable");
var Victoria = require("../renderer/victoria/victoria");

var VRect = Victoria.VRect;

export class Line extends ReactTS.ReactComponentBase<IProps, {}> {
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

    render: () => void;
}

Line.applyMixins(RenderableMixin);

export var Component = ReactTS.createReactComponent(Line);

export interface IProps {
    className?: string;
    stroke: string;
    strokeWidth: number;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}