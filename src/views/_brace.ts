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

        var height = (this.props.y2 - this.props.y) + 1;
        var mid = (this.props.y2 + this.props.y) / 2;
        var s = height;
        return <!g>
            <!Glyph.Component transform={"scale(" + s + "," + s + ")" +
                    "translate(" + (-this.props.fontSize*this.props.x*(1-1/s)) + "," +
                    -(1-1/s)*this.props.fontSize*mid + ")"}
                fill={"#000000"}
                fontSize={this.props.fontSize}
                key={0}
                x={this.props.x - 1/8}
                y={mid + 2/4}
                glyphName={"brace"} />
            <!Line.Component
                stroke="black"
                strokeWidth={defaults.thinBarlineThickness/4}
                fontSize={this.props.fontSize}
                key={1}
                x1={this.props.x}
                x2={this.props.x}
                y1={mid - height/2}
                y2={mid + height/2} />
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
        fontSize: number;
    }
}

export = Brace;
