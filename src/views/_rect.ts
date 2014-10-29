/**
 * Renders a rectangle (can be rotated!)
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

class Rect extends TypedReact.Component<Rect.IProps, {}> {
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
}

Rect.prototype.mixins = [RenderableMixin];

module Rect {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Rect);

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
}

export = Rect;