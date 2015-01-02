/**
 * Responsible for the rendering of a full-sized clef.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React                = require("react");
import TypedReact           = require("typed-react");
import assert               = require("assert");

import C                    = require("../stores/contracts");
import ClefModel            = require("../stores/clef");
import Glyph                = require("./_glyph");
import PureModelViewMixin   = require("./pureModelViewMixin");

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
