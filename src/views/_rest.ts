/**
 * Renders a rest.
 * 
 * @copyright (C) Joshua Netterfield. Proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Written by Joshua Netterfield <joshua@nettek.ca>, August 2014
 */

/* tslint:disable */

import React = require("react");
import TypedReact = require("typed-react");
import _ = require("lodash");
import assert = require("assert");
var PureRenderMixin = require("react/lib/ReactComponentWithPureRenderMixin");

import Dot = require("./_dot");
import Glyph = require("./_glyph");
import NoteNotation = require("./_noteNotation");

class Rest extends TypedReact.Component<Rest.IProps, {}> {
    render() {
        var line = this.props.line;
        assert.deepEqual(line, [3]);
        return <!g>
            <!Glyph.Component
                key="r"
                x={this.props.x + this.props.spacing}
                y={this.props.y}
                fill={this.props.stroke}
                glyphName={this.props.notehead} />
            {this.props.dotted ? _.times(this.props.dotted, idx => <!Dot.Component
                idx={idx}
                key={idx + "d"}
                radius={2.4}
                stroke={this.props.stroke}
                x={this.props.x + this.props.spacing}
                y={this.props.y}
                line={3} />): null}
            {this.props.children && _.map(this.props.children, (element, idx) => {
                element.props.direction = this.direction();
                element.props.line = this.startingLine();
                element.props.x = this.props.x;
                element.props.y = this.props.y;
                element.props.idx = idx;
                element.props.notehead = this.props.notehead;
                return element;
            })}
        </g>;
    }

    direction() {
        return 1;
    }

    startingLine() {
        // TODO: stub
        return 3;
    }
}

module Rest {
    "use strict";
    export var Component = TypedReact.createClass(Rest, [PureRenderMixin]);

    export interface IProps {
        children: NoteNotation[];
        dotted: number;
        line: Array<number>;
        notehead: string;
        spacing: number;
        stroke: string;
        x: number;
        y: number;
    }
}

export = Rest;
