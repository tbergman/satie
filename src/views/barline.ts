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

import C                    = require("../stores/contracts");
import BarlineModel         = require("../stores/barline");
import Rect                 = require("./_rect");
import Line                 = require("./_line");
import PureModelViewMixin   = require("./pureModelViewMixin");
import SMuFL                = require("../util/SMuFL");

/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */
class Barline extends TypedReact.Component<Barline.IProps, {}> {
    render(): any {
        var spec = this.props.spec;
        var defaults = SMuFL.bravuraMetadata.engravingDefaults;

        var thickX = spec.x + defaults.barlineSeparation*10 +
            defaults.thickBarlineThickness*10;

        if (spec.barStyle.data === C.MusicXML.BarStyleType.LightHeavy) {
            return <!g>
                <!Line.Component
                    key={1}
                    x1={spec.x}
                    x2={spec.x}
                    y1={spec.y - spec.height - spec.yOffset}
                    y2={spec.y + spec.height - spec.yOffset}
                    stroke={spec.barStyle.color}
                    victoriaYStrokeWidthFactor={0}
                    fill={spec.barStyle.color}
                    strokeWidth={defaults.thinBarlineThickness*10} />
                <!Line.Component
                    key={2}
                    x1={thickX}
                    x2={thickX}
                    y1={spec.y - spec.height - spec.yOffset}
                    y2={spec.y + spec.height - spec.yOffset}
                    victoriaYStrokeWidthFactor={0}
                    stroke={spec.barStyle.color}
                    fill={spec.barStyle.color}
                    strokeWidth={defaults.thickBarlineThickness*10} />
                {/* HACK HACK HACK: We're drawing a white bar to
                    cover over the empty part of the stave.*/}
                <!Rect.Component
                    key={3}
                    opacity={1.0}
                    x={spec.x + defaults.barlineSeparation*10 +
                        defaults.thickBarlineThickness*10 +
                        defaults.thinBarlineThickness*10}
                    y={spec.y - spec.height - 1 - spec.yOffset}
                    stroke={"#FFFFFF"}
                    fill={"#FFFFFF"}
                    height={spec.height*2 + 2}
                    width={4000} />
            </g>;
        }

        return <!Line.Component
            x1={spec.x}
            x2={spec.x}
            y1={spec.y - spec.height - spec.yOffset}
            y2={spec.y + spec.height - spec.yOffset}
            stroke={spec.barStyle.color}
            fill={spec.barStyle.color}
            strokeWidth={defaults.thinBarlineThickness*10} />
    }
};

module Barline {
    "use strict";
    export var Component = TypedReact.createClass(Barline, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: BarlineModel;
    }
}

export = Barline;
