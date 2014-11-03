/**
 * Responsible for the rendering of a full-sized clef.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

import ReactTS = require("react-typescript");

import ClefModel = require("../stores/clef");
import ClefToolType = require("../stores/clefTool"); // Potentially recursive. For types only.
import Glyph = require("./_glyph");
import Group = require("./_group");

class Clef extends ReactTS.ReactComponentBase<Clef.IProps, {}> {
    render() {
        var spec = this.props.spec;
        var x = spec.x - (spec.isChange ? 0.2 : 0);
        var clef = Glyph.Component({
            x: x,
            y: spec.y - (this.line - 3)/4,
            opacity: this.props.opacity,
            fill: spec.color,
            fontSize: this.props.fontSize,
            glyphName: this.sign + (spec.isChange ? "Change" : "")});
        var ClefTool: typeof ClefToolType = require("../stores/clefTool");
        if (this.isLocked && global.SongEditor.tool instanceof ClefTool) {
            return Group(null,
                Glyph.Component({
                    x: x + 0.65,
                    y: spec.y - 0.88,
                    opacity: 0.2,
                    fill: "#000000",
                    scale: 0.5,
                    fontSize: this.props.fontSize,
                    glyphName: "fa-lock",
                    code: "\uF023" /*fa-lock*/
                }),
                clef);
        } else {
            return clef;
        }
    }

    get isLocked() {
        return this.props.spec.clef !== "detect";
    }

    get sign() {
        var clef = this.props.spec.displayedClefName;
        return this.clefToSign[clef] || clef;
    }

    get line(): number {
        return ClefModel.clefToLine[this.props.spec.displayedClefName];
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
    export var Component = ReactTS.createReactComponent(Clef);

    export interface IProps {
        key: number;
        spec: ClefModel;
        fontSize: number;
        opacity?: number;
    }
}

export = Clef;