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

import TypedReact       = require("typed-react");
import React            = require("react");

import C                = require("../stores/contracts");
import WedgeModel       = require("../stores/wedge");
import Line             = require("./_line");

/**
 * @file Renders a crescendo or diminuendo.
 */
class Wedge extends TypedReact.Component<Wedge.IProps, {}> {
    render() {
        var spec = this.props.spec;
        var strokeWidth = 0.04;
        var isCrec = spec.wedgeType === C.MusicXML.WedgeType.Crescendo;

        if (spec.wedgeType === C.MusicXML.WedgeType.Stop) {
            return null;
        }

        var yOut = [
            spec.y - strokeWidth / 2 + 1.2 - 0.15,
            spec.y - strokeWidth / 2 + 1.2 + 0.15
        ];

        var yIn = [
            spec.y - strokeWidth / 2 + 1.2,
            spec.y - strokeWidth / 2 + 1.2,
        ];

        return <!g>
            <!Line.Component
                x1={spec.x}
                x2={spec.x + 0.8}
                y1={(isCrec ? yIn : yOut)[0]}
                y2={(isCrec ? yOut : yIn)[0]}
                stroke="#000000"
                strokeWidth={0.04} />
            <!Line.Component
                x1={spec.x}
                x2={spec.x + 0.8}
                y1={(isCrec ? yIn : yOut)[1]}
                y2={(isCrec ? yOut : yIn)[1]}
                stroke="#000000"
                strokeWidth={0.04} />
        </g>;
    }

    _hash: number;
    shouldComponentUpdate(nextProps: {}, nextState: {}) {
        var oldHash         = this._hash;
        this._hash          = C.JSONx.hash(nextProps);

        return oldHash !== this._hash;
    }
}

module Wedge {
    "use strict";
    export var Component = TypedReact.createClass(Wedge);
    export interface IProps {
        key: number;
        spec: WedgeModel;
    }
}

export = Wedge;
