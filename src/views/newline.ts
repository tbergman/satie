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

import React                = require("react");
import TypedReact           = require("typed-react");

import Brace                = require("./_brace");
import C                    = require("../stores/contracts");
import NewlineModel         = require("../stores/newline");
import PureModelViewMixin   = require("./pureModelViewMixin");
import StaveLines           = require("./_staveLines");
import BarNumber            = require("./_barNumber");

/**
 * Appears at the very beginning of a line, except the first line.
 * 
 * See also BeginModel and BeginView.
 */
class NewlineView extends TypedReact.Component<NewlineView.IProps, {}> {
    render() {
        var spec        = this.props.spec;
        var barNumber   = spec.ctxData.bar + "";

        return <!g>
            <!StaveLines.Component
                key="StaveLines"
                width={this.props.spec.staveW}
                x={spec.x}
                y={spec.braceY} />
            <!BarNumber.Component 
                x={spec.x - 0}
                y={spec.braceY - 30}
                barNumber={barNumber} />
        </g>;

        // {spec.pianoSystemContinues && spec.braceY2 - spec.braceY > 1 && <!Brace.Component MXFIX
        //     idx={1}
        //     x={spec.x}
        //     fontSize={this.props.fontSize}
        //     y={spec.braceY + spec.lineSpacing}
        //     y2={spec.braceY2 + spec.lineSpacing} />}
    }
};


module NewlineView {
    "use strict";
    export var Component = TypedReact.createClass(NewlineView, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: NewlineModel;
    }
}

export = NewlineView;
