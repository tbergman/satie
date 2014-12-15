/**
 * Responsible for the rendering a bezier curve, such as a
 * slur or a tie.
 */

import React            = require("react");
import TypedReact       = require("typed-react");
var PureRenderMixin     = require("react/lib/ReactComponentWithPureRenderMixin");

class Bezier extends TypedReact.Component<Bezier.IProps, {}> {
    render() {
        return React.DOM.path({
            d: <any>
               ("M" +
                    this.props.x1 + "," + this.props.y1 +
                "C" +
                    this.props.x2 + "," + this.props.y2 + " " +
                    this.props.x3 + "," + this.props.y3 + " " +
                    this.props.x4 + "," + this.props.y4 + " " +
                "C" +
                    this.props.x5 + "," + this.props.y5 + " " +
                    this.props.x6 + "," + this.props.y6 + " " +
                    this.props.x1 + "," + this.props.y1),
            fill: this.props.fill,
            strokeWidth: this.props.strokeWidth,
            stroke: this.props.stroke});
    }
}

module Bezier {
    "use strict";
    export var Component = TypedReact.createClass(Bezier, [PureRenderMixin]);

    export interface IProps {
        fill: string;
        stroke: string;
        strokeWidth: number;
        x1: number; x2: number; x3: number; x4: number; x5: number; x6: number;
        y1: number; y2: number; y3: number; y4: number; y5: number; y6: number;
    }
}

export = Bezier;
