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
import assert               = require("assert");

import C                    = require("../stores/contracts");
import ClefModel            = require("../stores/clef");
import Glyph                = require("./_glyph");
import PureModelViewMixin   = require("./pureModelViewMixin");

/**
 * Responsible for the rendering of a clef.
 */
class Clef extends TypedReact.Component<Clef.IProps, {}> {
    render(): any {
        var spec = this.props.spec;
        var x = spec.x - (spec.isChange ? 0.2 : 0);
        var clef = <!Glyph.Component
            x           = {x}
            y           = {spec.y - (this.line() - 3)*10}
            opacity     = {this.props.opacity}
            fill        = {spec.color}
            glyphName   = {this.sign()} />
        return clef;
    }

    sign() {
        var clef = this.props.spec.displayedClef.sign.toLowerCase();
        if (clef === "percussion") {
            return "unpitchedPercussionClef1";
        } else if (clef === "tab") {
            return "6stringTabClef";
        } else if (clef === "none") {
            return "staffPosRaise1";
        } else {
            // XXX: Just render at 2/3 pt
            return clef + "Clef" + (this.props.spec.isChange ? "Change" : "");
        }
    }

    line(): number {
        return this.props.spec.displayedClef.line;
    }
};

module Clef {
    "use strict";
    export var Component = TypedReact.createClass(Clef, [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: ClefModel;
        opacity?: number;
    }
}

export = Clef;
