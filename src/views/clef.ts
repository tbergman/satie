/**
 * Responsible for the rendering of a full-sized clef.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, October 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
import assert = require("assert");

import ClefModel = require("../stores/clef");
import ClefToolType = require("../stores/clefTool"); // Potentially recursive. For types only.
import Glyph = require("./_glyph");
import Group = require("./_group");

class Clef extends TypedReact.Component<Clef.IProps, {}> {
    render() {
        var spec = this.props.spec;
        var x = spec.x - (spec.isChange ? 0.2 : 0);
        var clef = <!Glyph.Component
            x={x}
            y={spec.y - (this.line() - 3)*10}
            opacity={this.props.opacity}
            fill={spec.color}
            glyphName={this.sign() + (spec.isChange ? "Change" : "")} />
        var ClefTool: typeof ClefToolType = require("../stores/clefTool");
        if (this.isLocked() && global.SongEditor.tool instanceof ClefTool) {
            return <!Group.Component>
                <!Glyph.Component
                    x={x + 2.5}
                    y={spec.y - 9.8}
                    opacity={0.2}
                    fill={"#000000"}
                    scale={0.5}
                    glyphName={"fa-lock"}
                    code={"\uF023" /*fa-lock*/} />
                {clef}
            </Group.Component>;
        } else {
            return clef;
        }
    }

    isLocked() {
        return this.props.spec.clef !== "detect";
    }

    sign() {
        var clef = this.props.spec.displayedClefName;
        return this.clefToSign[clef] || clef;
    }

    line(): number {
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
    export var Component = TypedReact.createClass(React.createClass, Clef);

    export interface IProps {
        key: number;
        spec: ClefModel;
        opacity?: number;
    }
}

export = Clef;
