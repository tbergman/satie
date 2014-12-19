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
import ClefToolType         = require("../stores/clefTool");    // Cyclic.
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
            glyphName   = {this.sign() + (spec.isChange ? "Change" : "")} />
        var ClefTool: typeof ClefToolType = require("../stores/clefTool");
        if (this.props.spec.isLocked && global.SongEditor.tool instanceof ClefTool) {
            return <!g>
                <!Glyph.Component
                    x={x + 10}
                    y={spec.y - 39.2}
                    opacity={0.2}
                    fill={"#000000"}
                    scale={3.5}
                    glyphName={"fa-lock"}
                    code={"\uF023" /*fa-lock*/} />
                {clef}
            </g>;
        } else {
            return clef;
        }
    }

    sign() {
        var clef = this.props.spec.displayedClef;
        return clef.sign.toLowerCase() + "Clef";
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
