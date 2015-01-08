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

import React            = require("react");
import TypedReact       = require("typed-react");
var    PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

/**
 * Responsible for the rendering of a dot as part of a dotted note.
 * This is not used to render staccatos.
 */
class Dot extends TypedReact.Component<Dot.IProps, {}> {
    render() {
        // See rationale for hidden rect in _glyph.jsx
        return React.DOM.g(null,
            React.DOM.circle({
                "data-selection-info": "dotted",
                cx: <any> (this.cx()),
                cy: <any> (this.cy()),
                fill: this.props.stroke,
                r: <any>(this.props.radius)}),
        global.isChoreServer ? null : React.DOM.rect({
                "data-selection-info": "dotted",
                width: 3,
                height: 3,
                x: <any> (this.cx() - 4),
                y: <any> (this.cy() - 4),
                fill: "transparent",
                className: "mn_handle"})
        );
    }

    cyOffset() {
        return ((this.props.line * 2) % 2) ? 0 : 5;
    }

    cx() {
        return this.props.x + 6*(this.props.idx);
    }
    cy() {
        return this.props.y - (this.props.line - 3)*10 - this.cyOffset();
    }
}

module Dot {
    "use strict";
    export var Component = TypedReact.createClass(Dot, [PureRenderMixin]);

    export interface IProps {
        x: number;
        y: number;
        radius: number;
        line: number;
        idx: number;
        stroke: string;
    }
}

export = Dot;
