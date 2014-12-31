/**
 * Renders a piano bracket or other kind of brace.
 */

/* tslint:disable */

import React            = require("react");
import TypedReact   	= require("typed-react");
var    PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import C                = require("../stores/contracts");
import Line     		= require("./_line");
import Glyph    		= require("./_glyph");

class Brace extends TypedReact.Component<Brace.IProps, {}> {
    render() {
        var defaults = C.SMuFL.bravuraMetadata.engravingDefaults;

        var height = (this.props.y2 - this.props.y) + 40;
        var bottom = this.props.y2 + 20;
        var s = height/40;
        return <!g>
            <!Glyph.Component transform={"scale(" + s + "," + s + ")" +
                    "translate(" + (-this.props.x*(1-1/s)) + "," +
                    -(1-1/s)*bottom + ")"}
                fill={"#000000"}
                key={0}
                x={this.props.x - 5}
                y={bottom}
                glyphName={"brace"} />
            <!Line.Component
                stroke="black"
                strokeWidth={defaults.thinBarlineThickness*10}
                key={1}
                x1={this.props.x}
                x2={this.props.x}
                y1={this.props.y - 20}
                y2={this.props.y2 + 20} />
        </g>;
    }
}


module Brace {
    "use strict";
    export var Component = TypedReact.createClass(Brace, [PureRenderMixin]);

    export interface IProps {
        x: number;
        y: number;
        y2: number;
        idx: number;
    }
}

export = Brace;
