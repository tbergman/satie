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

import React = require("react");
import TypedReact = require("typed-react");

/**
 * SVG sheet music renderer.
 */
class Molasses extends TypedReact.Component<Molasses.IProps, {}> {
    render() {
        return React.DOM.svg(
            {
                "data-page": this.props.page.idx,
                height: this.props.height,
                onClick: this.props.onClick,
                onMouseDown: this.props.onMouseDown,
                onMouseLeave: this.props.onMouseLeave,
                onMouseMove: this.props.onMouseMove,
                onMouseUp: this.props.onMouseUp,
                ref: "svg" + this.props.page.idx,
                viewBox: this.props.viewbox,
                width: this.props.width
            },
            this.props.children
        );
    }
};

module Molasses {
    "use strict";
    export interface IProps {
        children?: any;
        /**
         * A unit such as "in" should be included.
         */
        height: string;
        onClick?: (evt: React.MouseEvent) => void;
        onMouseDown?: (evt: React.MouseEvent) => void;
        onMouseLeave?: (evt: React.MouseEvent) => void;
        onMouseMove?: (evt: React.MouseEvent) => void;
        onMouseUp?: (evt: React.MouseEvent) => void;
        page: {
            idx: number;
        };
        viewbox: string;
        /**
         * A unit such as "in" should be included.
         */
        width: string;
    }

    export var Component = TypedReact.createClass(Molasses);
}

export = Molasses;
