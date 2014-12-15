/**
 * Renders a rectangle (can be rotated!)
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React            = require("react");
import TypedReact       = require("typed-react");
var    PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

class Rect extends TypedReact.Component<Rect.IProps, {}> {
    render() {
        return React.DOM.rect({
            className: this.props.className,
			opacity: this.props.opacity || 1.0,
            x: <any> (this.props.x),
            y: <any> (this.props.y),
            stroke: this.props.stroke,
            fill: this.props.fill,
            height: <any>(this.props.height),
            width: <any>(this.props.width)});
    }
}

module Rect {
    "use strict";
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

    export var Component = TypedReact.createClass(Rect, [PureRenderMixin]);
}

export = Rect;
