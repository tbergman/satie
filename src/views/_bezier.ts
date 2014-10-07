/**
 * Responsible for the rendering a bezier curve, such as a
 * slur or a tie.
 */

import React = require("react");
import ReactTS = require("react-typescript");

import RenderableMixin = require("./_renderable");
var Victoria = require("../renderer/victoria/victoria");

var VBezier = Victoria.VBezier;

export class Bezier extends ReactTS.ReactComponentBase<IProps, {}> {
    renderSVG() {
        var f = this.props.fontSizeFactor;
        return React.DOM.path({
            d: <any>
               ("M" +
                    f*this.props.x1 + "," + f*this.props.y1 +
                "C" +
                    f*this.props.x2 + "," + f*this.props.y2 + " " +
                    f*this.props.x3 + "," + f*this.props.y3 + " " +
                    f*this.props.x4 + "," + f*this.props.y4 + " " +
                "C" +
                    f*this.props.x5 + "," + f*this.props.y5 + " " +
                    f*this.props.x6 + "," + f*this.props.y6 + " " +
                    f*this.props.x1 + "," + f*this.props.y1),
            fill: this.props.fill,
            strokeWidth: f*this.props.strokeWidth,
            stroke: this.props.stroke});
    }

    renderGL() {
        var fill = this.props.stroke;
        if (fill === "black" || !fill) {
            fill = "#000000";
        }

        return this.transferPropsTo(VBezier(null));
    }

    render: () => void;
}

Bezier.applyMixins(RenderableMixin);

export interface IProps {
    fill: string;
    fontSizeFactor: number;
    stroke: string;
    strokeWidth: number;
    x1: number; x2: number; x3: number; x4: number; x5: number; x6: number;
    y1: number; y2: number; y3: number; y4: number; y5: number; y6: number;
}

export var Component = ReactTS.createReactComponent(Bezier);

