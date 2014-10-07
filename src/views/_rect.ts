/**
 * Renders a rectangle (can be rotated!)
 */

import React = require("react");
import ReactTS = require("react-typescript");

import RenderableMixin = require("./_renderable");
var Victoria = require("../renderer/victoria/victoria");

var VRect = Victoria.VRect;

export class Rect extends ReactTS.ReactComponentBase<IProps, {}> {
    renderSVG() {
        return React.DOM.rect({
            className: this.props.className,
			opacity: this.props.opacity || 1.0,
            x: <any> (this.props.x + "em"),
            y: <any> (this.props.y + "em"),
            stroke: this.props.stroke,
            fill: this.props.fill,
            height: <any>(this.props.height + "em"),
            width: <any>(this.props.width + "em")});
    }
    renderGL() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return VRect({
            fill: fill,
            x1: this.props.x,
            x2: this.props.x + this.props.width,
            y1: this.props.y,
            y2: this.props.y + this.props.height});
    }

    render: () => void;
}

Rect.applyMixins(RenderableMixin);

export var Component = ReactTS.createReactComponent(Rect);

export interface IProps {
    className?: string;
    fill: string;
    height: number;
    opacity: number;
    stroke: string;
    width: number;
    x: number;
    y: number;
}
