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

import BeginModel           = require("../stores/begin");
import Brace                = require("./_brace");
import C                    = require("../stores/contracts");
import PureModelViewMixin   = require("./pureModelViewMixin");
import StaveLines           = require("./_staveLines");


/**
 * Appears at the very beginning of the first stave.
 * See also NewLineView
 */
class BeginView extends TypedReact.Component<BeginView.IProps, {}> {
    render() {
        var spec = this.props.spec;

        return <!g>
            <!StaveLines.Component
                key="StaveLines"
                width={this.props.spec.staveW}
                x={spec.x}
                y={spec.braceY} />
            {spec.startOfSystem && spec.braceY2 - spec.braceY > 1 && <!Brace.Component
                idx={1}
                x={spec.x}
                y={spec.braceY}
                y2={spec.braceY2} />}
        </g>
    }
};

module BeginView {
    "use strict";
    export var Component = TypedReact.createClass(BeginView, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: BeginModel;
    }
}

export = BeginView;
