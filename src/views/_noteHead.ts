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

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");

import Glyph = require("./_glyph");

/**
 * Renders a note head.
 */
class NoteHead extends TypedReact.Component<NoteHead.IProps, {}> {
    render() {
        return <!Glyph.Component
            x={this.props.x}
            y={this.props.y - (this.props.line - 3)*10}
            fill={this.props.stroke}
            glyphName={this.props.notehead} />;
    }
    getDefaultProps() {
        return {
            x: 0,
            y: 0,
            line: 3
        };
    }
}

module NoteHead {
    "use strict";
    export var Component = TypedReact.createClass(NoteHead, [PureRenderMixin]);

    export interface IProps {
        line: number;
        notehead: string;
        stroke: string;
        x: number;
        y: number;
    }
}

export = NoteHead;
