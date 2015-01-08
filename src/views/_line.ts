/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React                = require("react");
import TypedReact           = require("typed-react");
var    PureRenderMixin      = require("react/lib/ReactComponentWithPureRenderMixin");

/**
 * Renders a straight line.
 */
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
