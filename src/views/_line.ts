/**
 * Renders a straight line.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React                = require("react");
import TypedReact           = require("typed-react");
var    PureRenderMixin      = require("react/lib/ReactComponentWithPureRenderMixin");

class Line extends TypedReact.Component<Line.IProps, {}> {
    render() {
        return React.DOM.line({
            className: this.props.className,
            x1: <any> (this.props.x1),
            x2: <any> (this.props.x2),
            y1: <any> (this.props.y1),
            y2: <any> (this.props.y2),
            stroke: this.props.stroke,
            strokeWidth: <any> (this.props.strokeWidth)});
    }
}

module Line {
    "use strict";
    export var Component = TypedReact.createClass(Line, [PureRenderMixin]);

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
