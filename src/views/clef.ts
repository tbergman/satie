/**
 * Responsible for the rendering of a full-sized clef.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

import React = require("react");
import TypedReact = require("typed-react");

import ClefModel = require("../stores/clef");
import Glyph = require("./_glyph");

class Clef extends TypedReact.Component<Clef.IProps, {}> {
    render() {
        var spec = this.props.spec;
        return Glyph.Component({
            x: spec.x - (spec.isChange ? 0.2 : 0),
            y: spec.y - (this.line() - 3)/4,
            fill: spec.color,
            fontSize: this.props.fontSize,
            glyphName: this.sign + (spec.isChange ? "Change" : "")});
    }

    sign() {
        var clef = this.props.spec.clefName;
        return this.clefToSign[clef] || clef;
    }

    line(): number {
        return ClefModel.clefToLine[this.props.spec.clefName];
    }

    clefToSign: { [key: string]: string } = {
        "treble": "gClef",
        "french": "gClef",
        "alto": "cClef",
        "tenor": "cClef",
        "bass": "fClef",
        "soprano": "cClef",
        "mezzosoprano": "cClef",
        "baritone": "cClef"
    };
};

module Clef {
    "use strict";
    export var Component = TypedReact.createClass(React.createClass, Clef);

    export interface IProps {
        key: number;
        spec: ClefModel;
        fontSize: number;
    }
}

export = Clef;